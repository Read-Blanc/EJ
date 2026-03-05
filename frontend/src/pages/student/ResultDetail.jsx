import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

function CircularProgress({ value, max }) {
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  const r    = 46;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);
  const color = pct >= 0.75 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="104" height="104" viewBox="0 0 104 104">
      <circle cx="52" cy="52" r={r} fill="none" stroke="#f0f0f0" strokeWidth="8" />
      <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        transform="rotate(-90 52 52)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
    </svg>
  );
}

function gradeLabel(pct) {
  if (pct === null) return 'Pending';
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export default function ResultDetail() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const location  = useLocation();
  const submission = location.state?.submission ?? null;

  const [answers,  setAnswers]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchAnswers = useCallback(async () => {
    if (!submission?.id && !id) return;
    setLoading(true);
    const subId = submission?.id ?? id;

    const { data, error } = await supabase
      .from('answers')
      .select('id, answer_text, marks_awarded, questions(id, text, marks, sample_answer, order_index)')
      .eq('submission_id', subId);

    if (error || !data) { setAnswers([]); setLoading(false); return; }
    setAnswers([...data].sort((a, b) => (a.questions?.order_index ?? 0) - (b.questions?.order_index ?? 0)));
    setLoading(false);
  }, [submission, id]);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

  const formatDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  if (!submission && !id) return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 p-10">
      No submission selected.{' '}
      <button onClick={() => navigate('/student/results')} className="ml-2 text-indigo-600 underline">Return to results</button>
    </div>
  );

  const totalMarks   = answers.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0);
  const awardedMarks = answers.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0);
  const pct          = submission?.status === 'Graded' && totalMarks > 0
    ? Math.round((awardedMarks / totalMarks) * 100) : null;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => navigate('/student/results')} className="hover:text-gray-700 transition">My Results</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{submission?.title}</span>
        </nav>
      </div>

      <div className="p-6">
        {/* Title row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{submission?.title}</h1>
            <div className="text-sm text-gray-400 mt-1">
              {submission?.topic ? `${submission.topic} · ` : ''}Submitted {formatDate(submission?.submittedAt)}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold mt-1 ${submission?.status === 'Graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {submission?.status ?? 'Pending'}
          </span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Questions',    value: loading ? '—' : answers.length,              sub: 'in this submission' },
            { label: 'Total Marks',  value: loading ? '—' : totalMarks,                  sub: 'available' },
            { label: 'Your Score',   value: pct !== null ? awardedMarks : '—',           sub: pct !== null ? `${pct}% score` : 'pending review',
              color: pct !== null ? (pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500') : 'text-gray-400' },
            { label: 'Grade',        value: gradeLabel(pct),                              sub: 'overall grade',
              color: pct !== null && pct >= 60 ? 'text-emerald-500' : pct !== null ? 'text-red-500' : 'text-gray-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
              <div className={`text-[28px] font-bold leading-none mb-1 ${color ?? 'text-gray-900'}`}>{value}</div>
              <div className="text-xs text-gray-400">{sub}</div>
            </div>
          ))}
        </div>

        {/* Main layout */}
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">Loading answers…</div>
        ) : (
          <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
            {/* Left: answers */}
            <div className="space-y-4">
              {answers.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">No answers found.</div>
              ) : answers.map((a, idx) => {
                const max       = a.questions?.marks ?? 0;
                const awarded   = a.marks_awarded ?? null;
                const qPct      = awarded !== null && max > 0 ? awarded / max : null;
                const scoreColor = qPct !== null ? (qPct >= 0.75 ? '#10b981' : qPct >= 0.5 ? '#f59e0b' : '#ef4444') : '#ccc';

                return (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                    {/* Question */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Question {idx + 1}</span>
                        <span className="text-xs font-semibold text-gray-500">
                          {awarded !== null ? `${awarded} / ${max} marks` : `${max} marks`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{a.questions?.text ?? '—'}</p>
                    </div>

                    {/* Sample answer */}
                    {a.questions?.sample_answer && (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Reference Answer</div>
                        <p className="text-xs text-gray-500 leading-relaxed">{a.questions.sample_answer}</p>
                      </div>
                    )}

                    {/* Student answer */}
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Answer</div>
                      <div className="bg-gray-50 border-l-4 border-indigo-400 rounded-r-lg p-3">
                        {a.answer_text
                          ? a.answer_text.split('\n\n').map((para, i) => <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1 last:mb-0">{para}</p>)
                          : <p className="text-sm text-gray-400 italic">No answer submitted.</p>
                        }
                      </div>
                    </div>

                    {/* Score bar */}
                    {qPct !== null && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${qPct * 100}%`, background: scoreColor }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: scoreColor }}>{Math.round(qPct * 100)}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right sidebar */}
            <aside className="space-y-3 sticky top-[56px]">
              {/* Grade ring */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-sm font-semibold text-gray-900 mb-4">Overall Grade</div>
                <div className="flex justify-center mb-3 relative">
                  <CircularProgress value={pct !== null ? awardedMarks : 0} max={totalMarks > 0 ? totalMarks : 1} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[28px] font-bold text-gray-900 leading-none">{pct !== null ? awardedMarks : '—'}</span>
                      <span className="text-xs text-gray-400">/{totalMarks}</span>
                    </div>
                  </div>
                </div>
                {pct !== null && (
                  <div className={`text-center text-lg font-bold ${pct >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {gradeLabel(pct)} · {pct}%
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                {[
                  { label: 'Assessment', value: submission?.title },
                  { label: 'Topic',      value: submission?.topic || 'No topic' },
                  { label: 'Status',     value: submission?.status },
                  { label: 'Submitted',  value: formatDate(submission?.submittedAt) },
                  { label: 'Max Marks',  value: `${totalMarks} marks` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                    <span className="text-xs text-gray-700 font-semibold text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}