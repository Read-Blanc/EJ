import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function statusClass(s) {
  return {
    Active:    'bg-green-100 text-green-700',
    Draft:     'bg-gray-100 text-gray-500',
    Closed:    'bg-red-100 text-red-600',
    Scheduled: 'bg-blue-50 text-blue-600',
  }[s] ?? 'bg-gray-100 text-gray-500';
}

function submissionStatusClass(s) {
  return s === 'Graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
}

export default function AssessmentDetail() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const { id }    = useParams();

  const [assessment,  setAssessment]  = useState(null);
  const [questions,   setQuestions]   = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: a }, { data: qs }, { data: subs }] = await Promise.all([
      supabase.from('assessments').select('id, title, topic, status, access_code, created_at, open_at, close_at').eq('id', id).single(),
      supabase.from('questions').select('id, text, marks, answer_length, order_index').eq('assessment_id', id).order('order_index'),
      supabase.from('submissions')
        .select('id, status, submitted_at, profiles(full_name, email), answers(marks_awarded, questions(marks))')
        .eq('assessment_id', id)
        .order('submitted_at', { ascending: false }),
    ]);

    setAssessment(a ?? null);
    setQuestions(qs ?? []);
    setSubmissions((subs ?? []).map(s => {
      const maxM  = s.answers?.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0) ?? 0;
      const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
      const pct   = s.status === 'Graded' && maxM > 0 ? Math.round((award / maxM) * 100) : null;
      return {
        id: s.id, status: s.status,
        studentName: s.profiles?.full_name || s.profiles?.email || 'Unknown',
        date: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
        awarded: award, maxMarks: maxM, pct,
      };
    }));
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const copyCode = () => {
    if (!assessment?.access_code) return;
    navigator.clipboard.writeText(assessment.access_code).then(() => showToast('Access code copied!'));
  };

  // ── Per-assessment CSV export ──────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Student', 'Status', 'Awarded Marks', 'Max Marks', 'Percentage', 'Submitted'];
    const maxM = questions.reduce((s, q) => s + (q.marks || 0), 0);
    const lines = [
      headers.join(','),
      ...submissions.map(s => [
        `"${s.studentName}"`,
        s.status,
        s.status === 'Graded' ? s.awarded : '',
        maxM,
        s.pct != null ? `${s.pct}%` : '',
        s.date,
      ].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${assessment?.title ?? 'assessment'}-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported.');
  };

  const maxMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
  const graded   = submissions.filter(s => s.status === 'Graded').length;

  if (loading) return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 p-10">Loading…</div>
  );

  if (!assessment) return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 p-10">
      Assessment not found.{' '}
      {/* FIX: was text-indigo-600 */}
      <button onClick={() => navigate('/lecturer/assessments')} className="ml-2 text-gray-700 underline hover:text-gray-900">Back</button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => navigate('/lecturer/assessments')} className="hover:text-gray-700 transition">Assessments</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{assessment.title}</span>
        </nav>
        <div className="flex gap-2">
          {(assessment.status === 'Draft' || assessment.status === 'Scheduled') && (
            <button onClick={() => navigate(`/lecturer/assessments/${id}/edit`)}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition">
              Edit
            </button>
          )}
          {submissions.length > 0 && (
            <button onClick={exportCSV}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition">
              ↓ Export CSV
            </button>
          )}
          <button onClick={() => navigate('/lecturer/grading')}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
            View Grading Queue
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{assessment.title}</h1>
              <div className="text-sm text-gray-400 mt-1">{assessment.topic || 'No topic'}</div>
              {/* Schedule window */}
              {assessment.status === 'Scheduled' && assessment.open_at && (
                <div className="text-xs text-blue-500 mt-1">
                  Opens {new Date(assessment.open_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {assessment.close_at && ` · Closes ${new Date(assessment.close_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                </div>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(assessment.status)}`}>
              {assessment.status}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mt-5">
            {[
              { label: 'Questions',   value: questions.length },
              { label: 'Max Marks',   value: maxMarks },
              { label: 'Submissions', value: submissions.length },
              { label: 'Graded',      value: graded },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Access code */}
          {assessment.status === 'Active' && assessment.access_code && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Access Code</span>
              <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-md text-gray-700">{assessment.access_code}</span>
              {/* FIX: was text-indigo-600 */}
              <button onClick={copyCode} className="text-xs text-gray-500 hover:text-gray-800 hover:underline">Copy</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Questions list */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Questions</h2>
            {questions.length === 0 ? (
              <div className="text-sm text-gray-400">No questions yet.</div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 leading-relaxed">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-400">{q.marks} marks</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400 capitalize">{q.answer_length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submissions list */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Submissions</h2>
              {submissions.length > 0 && (
                <button onClick={exportCSV} className="text-xs text-gray-400 hover:text-gray-700 transition">↓ Export</button>
              )}
            </div>
            {submissions.length === 0 ? (
              <div className="text-sm text-gray-400">No submissions yet.</div>
            ) : (
              <div className="space-y-2">
                {submissions.map(s => (
                  <div key={s.id}
                    onClick={() => navigate(`/lecturer/grading/${s.id}`, {
                      state: { submission: { id: s.id, status: s.status, assessmentTitle: assessment.title, studentName: s.studentName, date: s.date } }
                    })}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{s.studentName}</div>
                      <div className="text-xs text-gray-400">{s.date}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === 'Graded' && s.pct !== null && (
                        <span className="text-xs font-semibold text-gray-700">{s.awarded}/{s.maxMarks} ({s.pct}%)</span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${submissionStatusClass(s.status)}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}