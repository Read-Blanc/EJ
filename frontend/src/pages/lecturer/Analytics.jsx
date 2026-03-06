import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function BarChart({ data, height = 100 }) {
  if (!data?.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-400">No data yet</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10 transition">
            {d.value}
          </div>
          <div className="w-full bg-gray-900 rounded-t-sm transition-all duration-500"
            style={{ height: `${Math.max(4, (d.value / max) * (height - 20))}px` }} />
          <span className="text-[9px] text-gray-400 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { user } = useContext(AuthContext);
  const [stats,        setStats]        = useState(null);
  const [assessments,  setAssessments]  = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [asmDetail,    setAsmDetail]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [detailLoading,setDetailLoading]= useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const [{ data: asms }, { data: subs }] = await Promise.all([
      supabase.from('assessments').select('id, title, status, created_at, questions(marks)').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('submissions').select('id, status, submitted_at, assessment_id, assessments!inner(created_by), answers(marks_awarded, questions(marks))').eq('assessments.created_by', user.id),
    ]);

    const asmList = asms ?? [];
    const subList = subs ?? [];
    const graded  = subList.filter(s => s.status === 'Graded');

    const scores = graded.map(s => {
      const maxM  = s.answers?.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0) ?? 0;
      const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
      return maxM > 0 ? Math.round((award / maxM) * 100) : null;
    }).filter(Boolean);

    const avg      = scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null;
    const passRate = scores.length ? Math.round((scores.filter(s => s >= 50).length / scores.length) * 100) : null;

    // Submission trend – last 7 days
    const now = Date.now();
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const trend = Array(7).fill(0);
    subList.forEach(s => {
      if (!s.submitted_at) return;
      const diff = Math.floor((now - new Date(s.submitted_at).getTime()) / 86400000);
      if (diff >= 0 && diff < 7) trend[6 - diff]++;
    });
    const trendData = Array.from({ length: 7 }, (_, i) => ({
      label: days[(new Date(now - (6 - i) * 86400000)).getDay()],
      value: trend[i],
    }));

    // Score distribution
    const buckets = [
      { label: '0–49',  value: scores.filter(s => s < 50).length },
      { label: '50–59', value: scores.filter(s => s >= 50 && s < 60).length },
      { label: '60–69', value: scores.filter(s => s >= 60 && s < 70).length },
      { label: '70–79', value: scores.filter(s => s >= 70 && s < 80).length },
      { label: '80–89', value: scores.filter(s => s >= 80 && s < 90).length },
      { label: '90+',   value: scores.filter(s => s >= 90).length },
    ];

    // Per-assessment sub counts
    const subMap = {};
    subList.forEach(s => {
      if (!subMap[s.assessment_id]) subMap[s.assessment_id] = { total: 0, graded: 0 };
      subMap[s.assessment_id].total++;
      if (s.status === 'Graded') subMap[s.assessment_id].graded++;
    });

    setStats({
      total:    asmList.length,
      active:   asmList.filter(a => a.status === 'Active').length,
      totalSubs: subList.length,
      graded:   graded.length,
      pending:  subList.length - graded.length,
      avg, passRate, trendData, buckets,
    });
    setAssessments(asmList.map(a => ({
      ...a,
      maxMarks:    a.questions?.reduce((s, q) => s + (q.marks ?? 0), 0) ?? 0,
      subCount:    subMap[a.id]?.total   ?? 0,
      gradedCount: subMap[a.id]?.graded  ?? 0,
    })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchDetail = async (asmId) => {
    setDetailLoading(true);
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, status, profiles(full_name, email), answers(marks_awarded, questions(marks))')
      .eq('assessment_id', asmId);
    if (!subs) { setAsmDetail(null); setDetailLoading(false); return; }
    const rows = subs.filter(s => s.status === 'Graded').map(s => {
      const maxM  = s.answers?.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0) ?? 0;
      const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
      const pct   = maxM > 0 ? Math.round((award / maxM) * 100) : 0;
      return { name: s.profiles?.full_name || s.profiles?.email || 'Student', award, maxM, pct };
    }).sort((a, b) => b.pct - a.pct);
    setAsmDetail({ rows, total: subs.length, graded: rows.length });
    setDetailLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">Analytics</div>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">Analytics</div>
      </div>

      <div className="p-6 space-y-5">

        {/* Stat cards — plain gray/white, no color accents */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Assessments', value: stats.total,     sub: `${stats.active} active` },
            { label: 'Total Submissions', value: stats.totalSubs, sub: `${stats.pending} pending` },
            { label: 'Avg. Score',        value: stats.avg != null ? `${stats.avg}%` : '—', sub: 'across graded' },
            { label: 'Pass Rate',         value: stats.passRate != null ? `${stats.passRate}%` : '—', sub: '≥50% threshold' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{c.label}</div>
              <div className="text-3xl font-bold text-gray-900 mb-0.5">{c.value ?? '0'}</div>
              <div className="text-xs text-gray-400">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-bold text-gray-900 mb-1">Submissions — Last 7 Days</div>
            <div className="text-xs text-gray-400 mb-4">Daily submission count</div>
            <BarChart data={stats.trendData} height={100} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-bold text-gray-900 mb-1">Score Distribution</div>
            <div className="text-xs text-gray-400 mb-4">{scores?.length ?? stats.graded} graded submissions</div>
            <BarChart data={stats.buckets} height={100} />
          </div>
        </div>

        {/* Assessment table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">Assessments</div>
            {selected && (
              <button onClick={() => { setSelected(null); setAsmDetail(null); }}
                className="text-xs text-gray-400 hover:text-gray-700">✕ Clear</button>
            )}
          </div>
          {assessments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No assessments yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Assessment', 'Status', 'Submissions', 'Graded', 'Max Marks'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assessments.map(a => (
                  <tr key={a.id}
                    onClick={() => { setSelected(a); fetchDetail(a.id); }}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${selected?.id === a.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">{a.title}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.status === 'Active'  ? 'bg-green-100 text-green-700' :
                        a.status === 'Draft'   ? 'bg-gray-100 text-gray-500'  :
                                                 'bg-gray-100 text-gray-500'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{a.subCount}</td>
                    <td className="px-5 py-3 text-gray-700">{a.gradedCount}</td>
                    <td className="px-5 py-3 text-gray-700">{a.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Drill-down */}
        {selected && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="text-sm font-bold text-gray-900">{selected.title} — Student Results</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {asmDetail?.graded ?? '…'} graded of {asmDetail?.total ?? '…'} submitted
              </div>
            </div>
            {detailLoading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
            ) : !asmDetail?.rows?.length ? (
              <div className="p-6 text-center text-sm text-gray-400">No graded submissions yet.</div>
            ) : (
              <div className="p-5 space-y-2.5">
                {asmDetail.rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {r.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 w-36 truncate shrink-0">{r.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-24 text-right shrink-0">
                      {r.award}/{r.maxM} ({r.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}