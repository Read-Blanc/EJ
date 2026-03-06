import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const FILTERS  = ['All', 'Pending', 'Graded'];
const PAGE_SIZE = 20;

function initials(n = '') {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

function exportCSV(rows) {
  const headers = ['Student', 'Assessment', 'Status', 'Awarded', 'Max Marks', 'Percentage', 'Submitted'];
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.studentName}"`,
      `"${r.assessmentTitle}"`,
      r.status,
      r.awardedMarks ?? '',
      r.totalMarks   ?? '',
      r.pct != null ? `${r.pct}%` : '',
      r.date,
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `grading-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Grading() {
  const navigate = useNavigate();

  const [submissions,   setSubmissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [activeFilter,  setActiveFilter]  = useState('All');
  const [selected,      setSelected]      = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [toast,         setToast]         = useState('');
  const [page,          setPage]          = useState(1);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select(`id, status, submitted_at,
        assessments(title, questions(marks)),
        profiles(full_name, email),
        answers(id, marks_awarded, ai_score, questions(marks))`)
      .order('submitted_at', { ascending: false });

    if (error || !data) { setLoading(false); return; }

    setSubmissions(data.map(s => {
      const name       = s.profiles?.full_name || s.profiles?.email || 'Unknown';
      const totalMarks = s.assessments?.questions?.reduce((sum, q) => sum + (q.marks ?? 0), 0) ?? 0;
      const awarded    = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
      const hasAI      = s.answers?.some(a => a.ai_score !== null);
      const pct        = s.status === 'Graded' && totalMarks > 0 ? Math.round((awarded / totalMarks) * 100) : null;
      return {
        id: s.id, studentName: name, assessmentTitle: s.assessments?.title ?? '—',
        status: s.status ?? 'Pending', totalMarks, awardedMarks: s.status === 'Graded' ? awarded : null,
        pct, hasAI, answers: s.answers ?? [],
        initials: initials(name),
        date: s.submitted_at
          ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—',
        raw: s,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [activeFilter, search]);

  const filtered = submissions
    .filter(s => activeFilter === 'All' || s.status === activeFilter)
    .filter(s => !search ||
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.assessmentTitle.toLowerCase().includes(search.toLowerCase()));

  const totalPages     = Math.ceil(filtered.length / PAGE_SIZE);
  const paged          = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pendingWithAI  = submissions.filter(s => s.status === 'Pending' && s.hasAI);
  const pendingPageIds = paged.filter(s => s.status === 'Pending').map(s => s.id);
  const allPageSelected = pendingPageIds.length > 0 && pendingPageIds.every(id => selected.has(id));

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    const allSel = allPageSelected;
    setSelected(prev => {
      const next = new Set(prev);
      pendingPageIds.forEach(id => allSel ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleBulkApprove = async (targetIds) => {
    if (!targetIds.length) return;
    setBulkApproving(true);
    let approved = 0;
    for (const subId of targetIds) {
      const sub = submissions.find(s => s.id === subId);
      if (!sub || sub.status === 'Graded') continue;
      for (const ans of sub.answers) {
        if (ans.ai_score !== null) {
          const marks = Math.round(ans.ai_score * (ans.questions?.marks ?? 0));
          await supabase.from('answers').update({ marks_awarded: marks }).eq('id', ans.id);
        }
      }
      await supabase.from('submissions').update({ status: 'Graded' }).eq('id', subId);
      approved++;
    }
    setBulkApproving(false);
    setSelected(new Set());
    showToast(`✓ ${approved} submission${approved !== 1 ? 's' : ''} approved.`);
    fetchSubmissions();
  };

  const counts = { All: submissions.length, Pending: submissions.filter(s => s.status === 'Pending').length, Graded: submissions.filter(s => s.status === 'Graded').length };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">Grading Queue</div>
          <div className="text-xs text-gray-400">{loading ? 'Loading…' : `${counts.Pending} pending · ${submissions.length} total`}</div>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Search student or assessment…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-300" />
          <button onClick={() => exportCSV(filtered)}
            className="px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition">
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Filter tabs + bulk bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div className="flex gap-1 pt-3">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors mb-[-1px] ${
                activeFilter === f ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {f}
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${activeFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 py-2">
          {selected.size > 0 ? (
            <>
              <span className="text-xs text-gray-500">{selected.size} selected</span>
              <button onClick={() => handleBulkApprove([...selected])} disabled={bulkApproving}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50">
                {bulkApproving ? 'Approving…' : 'Approve AI Scores'}
              </button>
              <button onClick={() => setSelected(new Set())}
                className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-md hover:bg-gray-50 transition">
                Clear
              </button>
            </>
          ) : pendingWithAI.length > 0 && (
            <button onClick={() => handleBulkApprove(pendingWithAI.map(s => s.id))} disabled={bulkApproving}
              className="px-3 py-1.5 border border-gray-200 text-xs text-gray-700 font-medium rounded-md hover:bg-gray-50 transition disabled:opacity-50">
              {bulkApproving ? 'Approving…' : `Approve all AI scores (${pendingWithAI.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm font-medium text-gray-700">No submissions found</p>
            <p className="text-xs text-gray-400 mt-1">{search ? 'Try a different search.' : 'Nothing here yet.'}</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 w-10">
                      <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="rounded border-gray-300" />
                    </th>
                    {['Student', 'Assessment', 'Submitted', 'AI Score', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(s => (
                    <tr key={s.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${selected.has(s.id) ? 'bg-gray-50' : ''}`}
                      onClick={() => navigate(`/lecturer/grading/${s.id}`, {
                        state: { submission: { id: s.id, status: s.status, assessmentTitle: s.assessmentTitle, studentName: s.studentName, date: s.date } }
                      })}>
                      <td className="px-5 py-3.5" onClick={e => { e.stopPropagation(); if (s.status === 'Pending') toggleSelect(s.id); }}>
                        {s.status === 'Pending' && (
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded border-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {s.initials}
                          </div>
                          <span className="font-medium text-gray-900">{s.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 max-w-[180px] truncate">{s.assessmentTitle}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{s.date}</td>
                      <td className="px-4 py-3.5">
                        {s.hasAI
                          ? <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">AI ready</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status === 'Graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.status === 'Graded' && s.pct != null ? `${s.pct}% · Graded` : s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-400 hover:text-gray-700">Open →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-200 text-xs rounded-md hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page + i - 2;
                    if (p > totalPages) return null;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs rounded-md border transition ${p === page ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 border border-gray-200 text-xs rounded-md hover:bg-gray-50 disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}