import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

export default function TakeAssessments() {
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const { id }      = useParams();
  const location    = useLocation();

  const assessment = location.state?.assessment ?? null;

  const [questions,        setQuestions]        = useState([]);
  const [answers,          setAnswers]          = useState({});
  const [currentIdx,       setCurrentIdx]       = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [submitting,       setSubmitting]       = useState(false);
  const [submitted,        setSubmitted]        = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const assessmentId = assessment?.id ?? id;

    // Check for existing submission
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('student_id', user.id)
      .single();

    if (existing) { setAlreadySubmitted(true); setLoading(false); return; }

    const { data, error: qErr } = await supabase
      .from('questions')
      .select('id, text, marks, answer_length, order_index')
      .eq('assessment_id', assessmentId)
      .order('order_index');

    if (qErr || !data) { setError('Failed to load questions. Please try again.'); setLoading(false); return; }

    setQuestions(data);
    const init = {};
    data.forEach(q => { init[q.id] = ''; });
    setAnswers(init);
    setLoading(false);
  }, [assessment, id, user.id]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const assessmentId = assessment?.id ?? id;

    try {
      const { data: submission, error: sErr } = await supabase
        .from('submissions')
        .insert({ assessment_id: assessmentId, student_id: user.id, status: 'Pending' })
        .select()
        .single();
      if (sErr) throw sErr;

      const answerRows = questions.map(q => ({
        submission_id: submission.id,
        question_id:   q.id,
        answer_text:   answers[q.id] ?? '',
      }));

      const { error: aErr } = await supabase.from('answers').insert(answerRows);
      if (aErr) throw aErr;

      setSubmitted(true);
    } catch { setError('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-full p-10 text-sm text-gray-400">Loading assessment…</div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full p-10 text-sm text-red-500">{error}</div>
  );

  if (alreadySubmitted) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-sm w-full shadow-sm">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 text-2xl flex items-center justify-center mx-auto mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Already Submitted</h2>
        <p className="text-sm text-gray-400 mb-6">You have already submitted this assessment. Results will be available once graded.</p>
        <button onClick={() => navigate('/student/assessments')}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          Back to Assessments
        </button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-sm w-full shadow-sm">
        <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 text-2xl flex items-center justify-center mx-auto mb-4">✓</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Submitted!</h2>
        <p className="text-sm text-gray-400 mb-6">Your answers have been recorded. Results will appear once your lecturer grades them.</p>
        <button onClick={() => navigate('/student/assessments')}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          Back to Assessments
        </button>
      </div>
    </div>
  );

  // ── Stepper ───────────────────────────────────────────────────────────────
  const q        = questions[currentIdx];
  const isLast   = currentIdx === questions.length - 1;
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const rows     = q?.answer_length === 'short' ? 4 : q?.answer_length === 'long' ? 14 : 8;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-sm font-bold text-gray-900">{assessment?.title ?? 'Assessment'}</div>
          <div className="text-xs text-gray-400">Question {currentIdx + 1} of {questions.length}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIdx ? 'bg-gray-900' : answers[questions[i]?.id] ? 'bg-indigo-400' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Question {currentIdx + 1}</span>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{q?.marks ?? 0} marks</span>
            </div>
            <p className="text-base text-gray-900 leading-relaxed">{q?.text}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Answer</label>
            <textarea
              rows={rows}
              value={answers[q?.id] ?? ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q?.id]: e.target.value }))}
              placeholder="Type your answer here…"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition resize-none"
            />
            <div className="text-right text-xs text-gray-300 mt-1">
              {(answers[q?.id] ?? '').trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || Object.values(answers).every(v => !v.trim())}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Assessment'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}