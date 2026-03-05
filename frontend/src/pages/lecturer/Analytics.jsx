import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

export default function Analytics() {
  const { user } = useContext(AuthContext);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, title, status, questions(marks)')
      .eq('created_by', user.id);

    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, status, assessments!inner(created_by)')
      .eq('assessments.created_by', user.id);

    const total       = assessments?.length ?? 0;
    const active      = assessments?.filter(a => a.status === 'Active').length ?? 0;
    const totalSubs   = submissions?.length ?? 0;
    const graded      = submissions?.filter(s => s.status === 'Graded').length ?? 0;
    const pending     = totalSubs - graded;

    setStats({ total, active, totalSubs, graded, pending });
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const cards = stats ? [
    { label: 'Total Assessments',   value: stats.total,     color: 'bg-indigo-50 text-indigo-700',  accent: '#6366f1' },
    { label: 'Active Now',          value: stats.active,    color: 'bg-green-50 text-green-700',    accent: '#10b981' },
    { label: 'Total Submissions',   value: stats.totalSubs, color: 'bg-blue-50 text-blue-700',      accent: '#3b82f6' },
    { label: 'Graded',              value: stats.graded,    color: 'bg-emerald-50 text-emerald-700',accent: '#059669' },
    { label: 'Pending Review',      value: stats.pending,   color: 'bg-amber-50 text-amber-700',    accent: '#f59e0b' },
  ] : [];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">Analytics</div>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading analytics…</div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-4">
              {cards.map(c => (
                <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: c.accent }} />
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{c.label}</div>
                  <div className="text-4xl font-bold text-gray-900">{c.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="font-semibold text-gray-900 mb-1">Grading Progress</div>
              <div className="text-xs text-gray-400 mb-4">Graded vs Pending submissions</div>
              {stats.totalSubs === 0 ? (
                <div className="text-sm text-gray-400">No submissions yet.</div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Graded',  count: stats.graded,  fill: '#10b981' },
                    { label: 'Pending', count: stats.pending, fill: '#f59e0b' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-600 font-medium">{row.label}</div>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(row.count / stats.totalSubs) * 100}%`, background: row.fill }} />
                      </div>
                      <div className="w-8 text-sm text-gray-500 text-right">{row.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="font-semibold text-gray-900 mb-1">Detailed per-assessment analytics</div>
              <div className="text-sm text-gray-400">Coming soon — will show score distributions, average marks, and completion rates per assessment.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}