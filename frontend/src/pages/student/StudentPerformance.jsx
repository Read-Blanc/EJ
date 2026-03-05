import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function scoreColor(pct) {
  if (pct >= 75) return 'text-emerald-500';
  if (pct >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBg(pct) {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function StudentPerformance() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();

  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id, status, submitted_at,
        assessments(title, topic, questions(marks)),
        answers(marks_awarded)
      `)
      .eq('student_id', user.id)
      .eq('status', 'Graded')
      .order('submitted_at', { ascending: false });

    if (error || !data) { setResults([]); setLoading(false); return; }

    setResults(data.map(s => {
      const maxMarks  = s.assessments?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0;
      const awarded   = s.answers?.reduce((sum, a) => sum + (a.marks_awarded || 0), 0) ?? 0;
      const pct       = maxMarks > 0 ? Math.round((awarded / maxMarks) * 100) : null;
      return {
        id: s.id,
        title: s.assessments?.title ?? '—',
        topic: s.assessments?.topic ?? '',
        maxMarks, awarded, pct,
        date: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      };
    }));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // Derived stats
  const gradedCount = results.length;
  const avgPct = gradedCount > 0
    ? Math.round(results.filter(r => r.pct !== null).reduce((sum, r) => sum + r.pct, 0) / gradedCount)
    : null;
  const best  = gradedCount > 0 ? Math.max(...results.filter(r => r.pct !== null).map(r => r.pct)) : null;
  const worst = gradedCount > 0 ? Math.min(...results.filter(r => r.pct !== null).map(r => r.pct)) : null;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">My Performance</div>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading your performance data…</div>
        ) : gradedCount === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">📊</div>
            <div className="text-sm text-gray-400">No graded results yet.</div>
            <button onClick={() => navigate('/student/assessments')}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
              Take an Assessment
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Graded Results',  value: gradedCount,                      accent: '#6366f1' },
                { label: 'Average Score',   value: avgPct !== null ? `${avgPct}%` : '—', accent: '#3b82f6' },
                { label: 'Best Score',      value: best  !== null ? `${best}%`  : '—', accent: '#10b981' },
                { label: 'Lowest Score',    value: worst !== null ? `${worst}%` : '—', accent: '#f59e0b' },
              ].map(c => (
                <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: c.accent }} />
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{c.label}</div>
                  <div className="text-3xl font-bold text-gray-900">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Score chart (bar per assessment) */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="font-semibold text-gray-900 mb-1">Score History</div>
              <div className="text-xs text-gray-400 mb-5">All graded assessments, most recent first</div>
              <div className="space-y-3">
                {results.map(r => (
                  <div key={r.id} className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
                    onClick={() => navigate(`/student/results/${r.id}`, { state: { submission: r } })}>
                    <div className="w-40 min-w-[160px]">
                      <div className="text-sm font-medium text-gray-800 truncate">{r.title}</div>
                      <div className="text-xs text-gray-400">{r.date}</div>
                    </div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${r.pct ?? 0}%`, background: scoreBg(r.pct ?? 0) }} />
                    </div>
                    <div className={`w-12 text-sm font-bold text-right ${scoreColor(r.pct ?? 0)}`}>
                      {r.pct !== null ? `${r.pct}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Result list */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900 text-sm">All Results</div>
              <div className="divide-y divide-gray-50">
                {results.map(r => (
                  <div key={r.id}
                    onClick={() => navigate(`/student/results/${r.id}`, { state: { submission: r } })}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{r.title}</div>
                      <div className="text-xs text-gray-400">{r.topic || 'No topic'} · {r.awarded}/{r.maxMarks} marks · {r.date}</div>
                    </div>
                    <div className={`text-sm font-bold ${scoreColor(r.pct ?? 0)}`}>
                      {r.pct !== null ? `${r.pct}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}