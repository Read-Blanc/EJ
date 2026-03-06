import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(n = '') {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

// Simple sparkline — all gray
function Sparkline({ values }) {
  if (!values?.length || values.every(v => v === 0)) return null;
  const max = Math.max(...values, 1);
  const W = 72, H = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LecturerDashboard() {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const firstName  = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const [stats,    setStats]    = useState(null);
  const [pending,  setPending]  = useState([]);
  const [activity, setActivity] = useState([]);
  const [dist,     setDist]     = useState([]);
  const [trend,    setTrend]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [{ data: asms }, { data: allSubs }, { data: questions }] = await Promise.all([
      supabase.from('assessments').select('id, title, status').eq('created_by', user.id),
      supabase.from('submissions')
        .select('id, status, submitted_at, assessment_id, assessments!inner(created_by, title), profiles(full_name, email), answers(marks_awarded, questions(marks))')
        .eq('assessments.created_by', user.id)
        .order('submitted_at', { ascending: false }),
      supabase.from('questions').select('id').eq('assessment_id', '*'), // just count
    ]);

    const asmList = asms ?? [];
    const subList = allSubs ?? [];

    const pendingSubs = subList.filter(s => s.status === 'Pending');
    const gradedSubs  = subList.filter(s => s.status === 'Graded');

    // Average score
    const scores = gradedSubs.map(s => {
      const maxM  = s.answers?.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0) ?? 0;
      const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
      return maxM > 0 ? Math.round((award / maxM) * 100) : null;
    }).filter(v => v !== null);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null;

    // Score distribution buckets
    const buckets = [
      { label: '< 50%', count: scores.filter(s => s < 50).length },
      { label: '50–69', count: scores.filter(s => s >= 50 && s < 70).length },
      { label: '70–89', count: scores.filter(s => s >= 70 && s < 90).length },
      { label: '90+',   count: scores.filter(s => s >= 90).length },
    ];
    const maxBucket = Math.max(...buckets.map(b => b.count), 1);
    setDist(buckets.map(b => ({ ...b, pct: Math.round((b.count / maxBucket) * 100) })));

    // 7-day trend
    const now = Date.now();
    const trendArr = Array(7).fill(0);
    subList.forEach(s => {
      if (!s.submitted_at) return;
      const diff = Math.floor((now - new Date(s.submitted_at).getTime()) / 86400000);
      if (diff >= 0 && diff < 7) trendArr[6 - diff]++;
    });
    setTrend(trendArr);

    // Pending queue (top 5)
    setPending(pendingSubs.slice(0, 5).map(s => {
      const name = s.profiles?.full_name || s.profiles?.email || 'Unknown';
      return { id: s.id, student: name, assessment: s.assessments?.title ?? '—', initials: initials(name), raw: s };
    }));

    // Activity feed (last 8)
    setActivity(subList.slice(0, 8).map(s => {
      const name = s.profiles?.full_name || s.profiles?.email || 'Student';
      const verb = s.status === 'Graded' ? 'graded' : 'submitted';
      return { text: `${name} ${verb} ${s.assessments?.title ?? 'an assessment'}`, bold: name, time: s.submitted_at ? timeAgo(s.submitted_at) : '—' };
    }));

    setStats({
      totalAsm:     asmList.length,
      activeAsm:    asmList.filter(a => a.status === 'Active').length,
      pendingCount: pendingSubs.length,
      avgScore,
    });
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: refresh on new submission
  useEffect(() => {
    const ch = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const Skeleton = ({ className }) => <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <span>Home</span><span>/</span>
          <span className="text-gray-700 font-medium">Dashboard</span>
        </nav>
        <button onClick={() => navigate('/lecturer/grading')}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          {loading ? 'Grading Queue' : `Start Grading${stats?.pendingCount ? ` (${stats.pendingCount})` : ''}`}
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Welcome */}
        <div>
          <div className="text-xl font-bold text-gray-900">Good {greeting()}, {firstName}</div>
          <div className="text-sm text-gray-400 mt-0.5">Here's what's happening across your assessments today.</div>
          <div className="text-xs text-gray-300 mt-1">{today}</div>
        </div>

        {/* Stat cards — no color accents, just clean borders */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Assessments', value: stats?.totalAsm,   sub: `${stats?.activeAsm ?? 0} active` },
            { label: 'Pending Review',    value: stats?.pendingCount, sub: 'awaiting grading' },
            { label: 'Avg. Class Score',  value: stats?.avgScore != null ? `${stats.avgScore}%` : '—', sub: 'across graded' },
            { label: 'Submission Trend',  value: trend.reduce((a, b) => a + b, 0), sub: 'last 7 days', extra: <Sparkline values={trend} /> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{s.label}</div>
              {loading
                ? <Skeleton className="h-8 w-16 mb-1" />
                : <div className="text-3xl font-bold text-gray-900 mb-0.5">{s.value ?? '0'}</div>
              }
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">{s.sub}</div>
                {s.extra && !loading && s.extra}
              </div>
            </div>
          ))}
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Pending queue */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Grading Queue</div>
                <div className="text-xs text-gray-400">Scripts awaiting review</div>
              </div>
              <button onClick={() => navigate('/lecturer/grading')} className="text-xs text-gray-500 hover:text-gray-900 transition">
                View all →
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-50">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                All caught up — no pending submissions.
              </div>
            ) : (
              <>
                {pending.map(item => (
                  <div key={item.id}
                    onClick={() => navigate(`/lecturer/grading/${item.id}`, { state: { submission: { id: item.id, status: 'Pending', assessmentTitle: item.assessment, studentName: item.student } } })}
                    className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition">
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{item.student}</div>
                      <div className="text-xs text-gray-400 truncate">{item.assessment}</div>
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Pending</span>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <button onClick={() => navigate('/lecturer/grading')}
                    className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
                    Start Grading ({stats?.pendingCount ?? 0} pending)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">Recent Activity</div>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                  </div>
                ))
              ) : activity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet.</div>
              ) : activity.map((item, idx) => {
                const i = item.text.indexOf(item.bold);
                return (
                  <div key={idx} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-sm text-gray-700">
                        {i === -1 ? item.text : <>{item.text.slice(0, i)}<strong>{item.bold}</strong>{item.text.slice(i + item.bold.length)}</>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Score distribution */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-4">Score Distribution</div>
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : dist.every(d => d.count === 0) ? (
              <div className="text-center py-6 text-sm text-gray-400">No graded submissions yet.</div>
            ) : (
              <div className="space-y-3">
                {dist.map(d => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 shrink-0">{d.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-6 text-right shrink-0">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">Quick Actions</div>
            </div>
            <div className="p-3 space-y-1">
              {[
                { icon: '➕', label: 'New Assessment', sub: 'Create and publish',                   to: '/lecturer/assessments/new' },
                { icon: '✏️', label: 'Grade Scripts',  sub: `${stats?.pendingCount ?? 0} pending`, to: '/lecturer/grading' },
                { icon: '❓', label: 'Add Question',   sub: 'To question bank',                    to: '/lecturer/questions/new' },
                { icon: '📊', label: 'View Analytics', sub: 'Scores & trends',                     to: '/lecturer/analytics' },
              ].map(qa => (
                <button key={qa.label} onClick={() => navigate(qa.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition text-left">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base shrink-0">{qa.icon}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{qa.label}</div>
                    <div className="text-xs text-gray-400">{qa.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}