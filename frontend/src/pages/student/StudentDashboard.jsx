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

// Consistent status badge used across the whole app
function StatusBadge({ status }) {
  const styles = {
    Graded:  'bg-gray-900 text-white',
    Pending: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats,   setStats]   = useState({ available: 0, submitted: 0, graded: 0, avgScore: null });
  const [loading, setLoading] = useState(true);
  const [recent,  setRecent]  = useState([]);

  const firstName = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: enrolled } = await supabase
      .from('assessment_students')
      .select('assessments(id, title, topic, status)')
      .eq('student_id', user.id);

    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, status, submitted_at, assessments(title, topic, questions(marks)), answers(marks_awarded)')
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(5);

    const available = (enrolled ?? []).filter(e => e.assessments?.status === 'Active').length;
    const subList   = submissions ?? [];
    const graded    = subList.filter(s => s.status === 'Graded');
    let avgScore    = null;

    if (graded.length > 0) {
      const totals = graded.map(s => {
        const max     = s.assessments?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0;
        const awarded = s.answers?.reduce((sum, a) => sum + (a.marks_awarded || 0), 0) ?? 0;
        return max > 0 ? (awarded / max) * 100 : null;
      }).filter(Boolean);
      if (totals.length) avgScore = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    }

    setStats({ available, submitted: subList.length, graded: graded.length, avgScore });
    setRecent(subList.map(s => ({
      id:     s.id,
      title:  s.assessments?.title ?? '—',
      topic:  s.assessments?.topic ?? '',
      status: s.status,
      date:   s.submitted_at
        ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : '—',
    })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stat cards — monochrome, no random accent colours
  const statCards = [
    {
      label: 'Available',
      value: loading ? '—' : stats.available,
      sub: 'active assessments',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    },
    {
      label: 'Submitted',
      value: loading ? '—' : stats.submitted,
      sub: 'total submissions',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
    {
      label: 'Graded',
      value: loading ? '—' : stats.graded,
      sub: 'results available',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    },
    {
      label: 'Avg. Score',
      value: loading ? '—' : stats.avgScore !== null ? `${stats.avgScore}%` : '—',
      sub: 'across graded',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <span>Home</span><span>/</span>
          <span className="text-gray-700 font-medium">Dashboard</span>
        </nav>
        <button
          onClick={() => navigate('/student/assessments')}
          className="px-4 py-2 bg-gray-950 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition"
        >
          Take Assessment
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div>
          <div className="text-xl font-bold text-gray-900">Good {greeting()}, {firstName}</div>
          <div className="text-sm text-gray-400 mt-0.5">Here's a summary of your progress.</div>
          <div className="text-xs text-gray-300 mt-1">{today}</div>
        </div>

        {/* Stat cards — clean, monochrome, no colored top borders */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 mb-3">
                {s.icon}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-0.5">{s.value}</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</div>
              <div className="text-xs text-gray-300 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Recent submissions + Quick actions */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent submissions */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">Recent Submissions</div>
              <button
                onClick={() => navigate('/student/results')}
                className="text-xs text-gray-500 hover:text-gray-900 transition font-medium"
              >
                View all →
              </button>
            </div>
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                No submissions yet. Take an assessment to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recent.map(r => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/student/results/${r.id}`, { state: { submission: r } })}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">{r.title}</div>
                      <div className="text-xs text-gray-400">{r.topic || 'No topic'} · {r.date}</div>
                    </div>
                    <StatusBadge status={r.status} />
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
                { label: 'Take Assessment', desc: 'Start an available test',  to: '/student/assessments', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                { label: 'Past Results',    desc: 'View graded submissions', to: '/student/results',      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                { label: 'Performance',     desc: 'Your score trends',        to: '/student/performance',  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              ].map(qa => (
                <button
                  key={qa.label}
                  onClick={() => navigate(qa.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    {qa.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{qa.label}</div>
                    <div className="text-xs text-gray-400">{qa.desc}</div>
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