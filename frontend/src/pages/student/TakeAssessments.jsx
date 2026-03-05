/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, ChevronLeft, ChevronRight, Send, BookOpen, FileText, AlertTriangle } from 'lucide-react';
import { studentApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';

export default function TakeAssessments() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await studentApi.getAssessment(id);
        setAssessment(data);
        setQuestions(data.questions || []);
        setTimeRemaining((data.duration_minutes || 60) * 60);
        const initialAnswers = {};
        (data.questions || []).forEach(q => { initialAnswers[q.id] = ''; });
        setAnswers(initialAnswers);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load assessment');
        navigate('/student/assessments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!assessment || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [assessment]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getAnsweredCount = () => Object.values(answers).filter(v => v.trim()).length;

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (auto = false) => {
    setSubmitting(true);
    setShowSubmitModal(false);
    try {
      const submission = {
        assessment_id: parseInt(id),
        answers: Object.entries(answers).map(([question_id, answer_text]) => ({ question_id, answer_text })),
      };
      const result = await studentApi.submitAssessment(submission);
      toast.success(auto ? 'Time up! Assessment auto-submitted.' : 'Assessment submitted successfully!');
      navigate(`/student/results/${result.submission_id || result.id || id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent mb-3" />
            <p className="text-gray-500">Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const isLowTime = timeRemaining < 300;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className={`sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between ${isLowTime ? 'border-red-200' : ''}`}>
          <div>
            <h1 className="font-semibold text-gray-900">{assessment.title}</h1>
            <p className="text-sm text-gray-500">{assessment.subject}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-500">{getAnsweredCount()} / {questions.length} answered</div>
            <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-2 rounded-xl ${isLowTime ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-900'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
            <Button variant="primary" onClick={() => setShowSubmitModal(true)} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" /> Submit
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Question navigator */}
          <div className="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Questions</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(i)}
                  className={`h-9 w-full rounded-lg text-sm font-medium transition-all ${
                    i === currentQuestionIndex ? 'bg-brand-600 text-white' :
                    answers[q.id]?.trim() ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{i + 1}</button>
              ))}
            </div>
          </div>

          {/* Question content */}
          <div className="flex-1 overflow-y-auto p-8">
            {currentQuestion && (
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-400 mb-1">Question {currentQuestionIndex + 1} of {questions.length}</p>
                          <CardTitle className="text-xl leading-relaxed">{currentQuestion.question_text}</CardTitle>
                        </div>
                        {currentQuestion.marks && (
                          <span className="flex-shrink-0 px-3 py-1.5 bg-brand-50 text-brand-600 text-sm font-medium rounded-lg">
                            {currentQuestion.marks} marks
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Type your answer here..."
                        rows={10}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-2">{(answers[currentQuestion.id] || '').length} characters</p>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between mt-6">
                    <Button variant="secondary" onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))} disabled={currentQuestionIndex === 0}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button variant="secondary" onClick={() => setCurrentQuestionIndex(i => Math.min(questions.length - 1, i + 1))} disabled={currentQuestionIndex === questions.length - 1}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* Submit Modal */}
      {showSubmitModal && (
        <Modal
          title="Submit Assessment"
          icon={<Send className="w-6 h-6 text-brand-600" />}
          description={
            <>
              <p>You have answered {getAnsweredCount()} of {questions.length} questions.</p>
              {getAnsweredCount() < questions.length && (
                <p className="text-orange-600 mt-2">⚠️ {questions.length - getAnsweredCount()} question(s) unanswered.</p>
              )}
              <p className="mt-2 text-sm text-gray-500">Once submitted, you cannot make changes.</p>
            </>
          }
          onClose={() => setShowSubmitModal(false)}
          onConfirm={() => handleSubmit(false)}
          confirmText={submitting ? 'Submitting...' : 'Submit Now'}
          disabled={submitting}
        />
      )}
    </div>
  );
}

function Modal({ title, icon, description, onClose, onConfirm, confirmText, disabled }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">{icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <div className="text-sm text-gray-600">{description}</div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={disabled}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm} disabled={disabled}>{confirmText}</Button>
        </div>
      </motion.div>
    </div>
  );
}