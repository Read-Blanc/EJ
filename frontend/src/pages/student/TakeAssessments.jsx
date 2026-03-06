import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function formatTime(s) {
  if (s <= 0) return '00:00';
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function TakeAssessments() {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const { id }     = useParams();
  const location   = useLocation();
  const assessment = location.state?.assessment ?? null;
  const assessmentId = assessment?.id ?? id;

  const [questions,        setQuestions]        = useState([]);
  const [answers,          setAnswers]          = useState({});
  const [currentIdx,       setCurrentIdx]       = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [submitting,       setSubmitting]       = useState(false);
  const [submitted,        setSubmitted]        = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showConfirm,      setShowConfirm]      = useState(false);
  const [timeLeft,         setTimeLeft]         = useState(null);
  const [totalTime,        setTotalTime]        = useState(null);
  const [timedOut,         setTimedOut]         = useState(false);
  const timerRef      = useRef(null);
  const autoSubmitRef = useRef(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const { data: existing } = await supabase
      .from('submissions').select('id')
      .eq('assessment_id', assessmentId).eq('student_id', user.id).single();
    if (existing) { setAlreadySubmitted(true); setLoading(false); return; }

    const { data: asmData } = await supabase
      .from('assessments').select('duration_minutes').eq('id', assessmentId).single();

    const { data, error: qErr } = await supabase
      .from('questions').select('id, text, marks, answer_length, order_index')
      .eq('assessment_id', assessmentId).order('order_index');

    if (qErr || !data) { setError('Failed to load questions.'); setLoading(false); return; }

    setQuestions(data);
    const init = {};
    data.forEach(q => { init[q.id] = ''; });
    setAnswers(init);

    if (asmData?.duration_minutes) {
      const secs = asmData.duration_minutes * 60;
      setTotalTime(secs);
      const key = `evalai_timer_${assessmentId}_${user.id}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const elapsed = Math.floor((Date.now() - JSON.parse(saved).startTime) / 1000);
        const rem = Math.max(0, secs - elapsed);
        setTimeLeft(rem);
        if (rem === 0) setTimedOut(true);
      } else {
        sessionStorage.setItem(key, JSON.stringify({ startTime: Date.now() }));
        setTimeLeft(secs);
      }
    }
    setLoading(false);
  }, [assessmentId, user.id]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  useEffect(() => {
    if (timeLeft === null || submitted || alreadySubmitted) return;
    if (timeLeft <= 0) {
      if (!autoSubmitRef.current) { autoSubmitRef.current = true; setTimedOut(true); handleSubmit(true); }
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted, alreadySubmitted]); // eslint-disable-line

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true); setShowConfirm(false);
    try {
      const { data: sub, error: sErr } = await supabase
        .from('submissions').insert({ assessment_id: assessmentId, student_id: user.id, status: 'Pending' })
        .select().single();
      if (sErr) throw sErr;
      const { error: aErr } = await supabase.from('answers').insert(
        questions.map(q => ({ submission_id: sub.id, question_id: q.id, answer_text: answers[q.id] ?? '' }))
      );
      if (aErr) throw aErr;
      sessionStorage.removeItem(`evalai_timer_${assessmentId}_${user.id}`);
      setSubmitted(true);
      if (isAuto) setTimedOut(false);
    } catch { setError('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  }, [submitting, assessmentId, user.id, questions, answers]);

  const answeredCount   = questions.filter(q => answers[q.id]?.trim()).length;
  const unansweredCount = questions.length - answeredCount;
  const urgent          = timeLeft !== null && totalTime !== null && timeLeft / totalTime <= 0.2;

  if (loading) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading assessment…</span>
      </div>
    </div>
  );

  if (error && !submitting) return (
    <div className="flex items-center justify-center h-full p-10 text-sm text-gray-500">{error}</div>
  );

  if (alreadySubmitted) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center max-w-sm w-full">
        <div className="text-3xl mb-4">⚠</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Already Submitted</h2>
        <p className="text-sm text-gray-400 mb-6">You have already submitted this assessment. Results will appear once graded.</p>
        <button onClick={() => navigate('/student/results')}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          View Results
        </button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center max-w-sm w-full">
        <div className="w-14 h-14 rounded-full bg-gray-900 text-white text-2xl flex items-center justify-center mx-auto mb-4">✓</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Submitted!</h2>
        <p className="text-sm text-gray-400 mb-1">Your answers have been recorded.</p>
        <p className="text-xs text-gray-400 mb-6">{answeredCount} of {questions.length} questions answered</p>
        <button onClick={() => navigate('/student/assessments')}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          Back to Assessments
        </button>
      </div>
    </div>
  );

  const q      = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const rows   = q?.answer_length === 'short' ? 4 : q?.answer_length === 'long' ? 14 : 8;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-sm font-bold text-gray-900">{assessment?.title ?? 'Assessment'}</div>
          <div className="text-xs text-gray-400">Question {currentIdx + 1} of {questions.length} · {answeredCount} answered</div>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${urgent ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
              <span className="text-xs">⏱</span>
              <span className={`text-sm font-bold tabular-nums ${urgent ? 'text-white' : 'text-gray-700'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          <button onClick={() => setShowConfirm(true)} disabled={submitting}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      {timedOut && !submitted && (
        <div className="bg-gray-900 text-white text-sm font-medium text-center py-2.5">
          Time's up — auto-submitting your answers…
        </div>
      )}

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100">
        <div className="h-full bg-gray-900 transition-all duration-500"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-4">
        {/* Question nav */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((qs, i) => {
            const answered = answers[qs.id]?.trim();
            return (
              <button key={qs.id} onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded-md text-xs font-semibold transition-all border ${
                  i === currentIdx
                    ? 'bg-gray-900 text-white border-gray-900'
                    : answered
                    ? 'bg-gray-200 text-gray-700 border-gray-200'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                }`}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Question {currentIdx + 1}</span>
              <p className="text-base font-medium text-gray-900 mt-1 leading-relaxed">{q?.text}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap">
              {q?.marks} mark{q?.marks !== 1 ? 's' : ''}
            </span>
          </div>

          <textarea value={answers[q?.id] ?? ''} rows={rows} placeholder="Type your answer here…"
            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition resize-none leading-relaxed" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {answers[q?.id]?.trim().split(/\s+/).filter(Boolean).length || 0} words
            </span>
            {answers[q?.id]?.trim() && (
              <span className="text-xs text-gray-600 font-semibold">✓ Answered</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition disabled:opacity-30">
            ← Previous
          </button>
          {isLast ? (
            <button onClick={() => setShowConfirm(true)}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
              Review & Submit
            </button>
          ) : (
            <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition">
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Assessment?</h3>
            {unansweredCount > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-gray-700">
                  You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount !== 1 ? 's' : ''}.
                </p>
                <p className="text-xs text-gray-400 mt-1">You cannot change your answers after submission.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                All {questions.length} questions answered. You cannot change your answers after submission.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition">
                Go Back
              </button>
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}