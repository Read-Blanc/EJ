import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function gradeLabel(pct) {
  if (pct == null) return '—';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'F';
}

// Pure gray SVG line chart
function LineChart({ data, height = 160 }) {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>
      Complete more assessments to see your score trend.
    </div>
  );

  const pad = { top: 16, right: 16, bottom: 32, left: 40 };
  const W   = 480;
  const H   = height;
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top - pad.bottom;

  const toX = i  => pad.left + (i / (data.length - 1)) * cW;
  const toY = v  => pad.top  + cH - (v / 100) * cH;

  const pts  = data.map((d, i) => `${toX(i)},${toY(d.pct)}`).join(' ');
  const area = [`${toX(0)},${pad.top + cH}`, ...data.map((d, i) => `${toX(i)},${toY(d.pct)}`), `${toX(data.length - 1)},${pad.top + cH}`].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#111827" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={pad.left} y1={toY(v)} x2={pad.left + cW} y2={toY(v)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={pad.left - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: '#9ca3af' }}>{v}%</text>
        </g>
      ))}

      {/* Area fill */}
      <polygon points={area} fill="url(#lineGrad)" />

      {/* Line */}
      <polyline points={pts} fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + x labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.pct)} r="3.5" fill="white" stroke="#111827" strokeWidth="1.5" />
          <text x={toX(i)} y={pad.top + cH + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#9ca3af' }}>{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function StudentPerformance() {
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('trend');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select(`id, status, submitted_at, assessments(title, topic, questions(marks)), answers(marks_awarded)`)
      .eq('student_id', user.id)
      .eq('status', 'Graded')
      .order('submitted_at', { ascending: true });

    if (error || !data) { setResults([]); setLoading(false); return; }

    setResults(data.map(s => {
      const maxM  = s.assessments?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0;
      const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded || 0), 0) ?? 0;
      const pct   = maxM > 0 ? Math.round((award / maxM) * 100) : null;
      return {
        id: s.id, title: s.assessments?.title ?? '—', topic: s.assessments?.topic ?? '',
        maxM, award, pct,
        date: s.submitted_at
          ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : '—',
      };
    }));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const graded     = results.filter(r => r.pct !== null);
  const count      = graded.length;
  const avg        = count > 0 ? Math.round(graded.reduce((s, r) => s + r.pct, 0) / count) : null;
  const best       = count > 0 ? Math.max(...graded.map(r => r.pct)) : null;
  const worst      = count > 0 ? Math.min(...graded.map(r => r.pct)) : null;

  // Trend: improving, declining, steady
  let trendLabel = null;
  if (count >= 4) {
    const half  = Math.floor(count / 2);
    const early = graded.slice(0, half).reduce((s, r) => s + r.pct, 0) / half;
    const late  = graded.slice(-half).reduce((s, r) => s + r.pct, 0) / half;
    if (late - early > 5)  trendLabel = '↑ Improving';
    else if (early - late > 5) trendLabel = '↓ Declining';
    else trendLabel = '→ Steady';
  }

  // Topic breakdown
  const topicMap = {};
  graded.forEach(r => {
    const key = r.topic || r.title;
    if (!topicMap[key]) topicMap[key] = { scores: [], label: key };
    if (r.pct !== null) topicMap[key].scores.push(r.pct);
  });
  const topics = Object.values(topicMap)
    .map(t => ({ ...t, avg: Math.round(t.scores.reduce((a, b) => a + b) / t.scores.length) }))
    .sort((a, b) => b.avg - a.avg);

  const chartData = graded.slice(-10).map(r => ({ pct: r.pct, label: r.date }));

  if (loading) return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">My Performance</div>
      </div>
      <div className="p-6 grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (count === 0) return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">My Performance</div>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 p-10">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-sm font-semibold text-gray-700 mb-1">No graded results yet</p>
        <p className="text-xs text-gray-400 mb-6">Submit assessments and wait for your lecturer to grade them.</p>
        <button onClick={() => navigate('/student/assessments')}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          Take an Assessment
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">My Performance</div>
      </div>

      <div className="p-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Graded',       value: count },
            { label: 'Average',      value: avg  != null ? `${avg}%`  : '—', sub: avg  != null ? `Grade ${gradeLabel(avg)}`  : '' },
            { label: 'Best Score',   value: best != null ? `${best}%` : '—', sub: best != null ? `Grade ${gradeLabel(best)}` : '' },
            { label: 'Lowest Score', value: worst!= null ? `${worst}%`: '—' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{c.label}</div>
              <div className="text-3xl font-bold text-gray-900">{c.value}</div>
              {c.sub && <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* Trend badge */}
        {trendLabel && (
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full">
            {trendLabel}
            <span className="font-normal text-gray-500">based on last {count} assessments</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { key: 'trend',     label: 'Score Trend' },
              { key: 'breakdown', label: 'By Topic' },
              { key: 'history',   label: 'History' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'trend' && (
              <div>
                <p className="text-xs text-gray-400 mb-4">Your scores across the last {chartData.length} graded assessments</p>
                <LineChart data={chartData} height={160} />
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="space-y-3">
                {topics.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-4">No topic data available.</p>
                  : topics.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-36 truncate shrink-0">{t.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${t.avg}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-20 text-right shrink-0">
                        {t.avg}% · {gradeLabel(t.avg)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                {[...graded].reverse().map(r => (
                  <div key={r.id}
                    onClick={() => navigate(`/student/results/${r.id}`, { state: { submission: r } })}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{r.title}</div>
                      <div className="text-xs text-gray-400">{r.topic || 'No topic'} · {r.date}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">{r.award}/{r.maxM}</span>
                      <span className="text-sm font-bold text-gray-900">{r.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}