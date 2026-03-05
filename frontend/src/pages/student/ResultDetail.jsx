import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Award, CheckCircle2, AlertCircle, FileText, Lightbulb } from 'lucide-react';
import { studentApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';

const getGrade = (percentage) => {
  if (percentage >= 70) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
  if (percentage >= 60) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (percentage >= 50) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  if (percentage >= 45) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-50' };
  return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50' };
};

export default function ResultDetail() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await studentApi.getResultDetails(id);
        setResult(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load result details');
        setResult(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent mb-3" />
            <p className="text-gray-500">Loading result...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Result not found</h3>
            <p className="text-gray-500 mb-4">This result could not be loaded.</p>
            <Link to="/student/results">
              <Button variant="primary">Back to Results</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const percentage = result.percentage ?? (result.score && result.max_score ? Math.round((result.score / result.max_score) * 100) : 0);
  const gradeInfo = getGrade(percentage);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Link to="/student/results" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Results
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{result.assessment_title || 'Assessment Result'}</h1>
          {result.subject && <p className="text-brand-600 font-medium mt-1">{result.subject}</p>}
          {result.submitted_at && (
            <p className="text-gray-500 text-sm mt-1">Submitted {new Date(result.submitted_at).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          )}
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-1">
            <CardContent className="p-8 text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold mb-3 ${gradeInfo.bg} ${gradeInfo.color}`}>
                {gradeInfo.grade}
              </div>
              <p className="text-3xl font-bold text-gray-900">{percentage}%</p>
              {result.score != null && result.max_score != null && (
                <p className="text-gray-500 text-sm mt-1">{result.score} / {result.max_score} marks</p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Performance Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.ai_feedback && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">AI Feedback</p>
                      <p className="text-sm text-blue-700">{result.ai_feedback}</p>
                    </div>
                  </div>
                </div>
              )}
              {result.lecturer_comment && (
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm font-medium text-purple-900 mb-1">Lecturer Comment</p>
                  <p className="text-sm text-purple-700">{result.lecturer_comment}</p>
                </div>
              )}
              {!result.ai_feedback && !result.lecturer_comment && (
                <p className="text-gray-500 text-sm">No feedback available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Question Breakdown */}
        {result.answers && result.answers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Question Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {result.answers.map((answer, i) => (
                <motion.div key={answer.question_id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">{i + 1}</span>
                        <p className="text-sm font-medium text-gray-900">{answer.question_text}</p>
                      </div>
                      {answer.score != null && answer.max_score != null && (
                        <div className={`flex-shrink-0 px-3 py-1 rounded-lg text-sm font-semibold ${getGrade((answer.score / answer.max_score) * 100).bg} ${getGrade((answer.score / answer.max_score) * 100).color}`}>
                          {answer.score}/{answer.max_score}
                        </div>
                      )}
                    </div>
                    {answer.answer_text && (
                      <div className="ml-10 mt-2">
                        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Your Answer</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{answer.answer_text}</p>
                      </div>
                    )}
                    {answer.feedback && (
                      <div className="ml-10 mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-500 mb-1 font-medium">Feedback</p>
                        <p className="text-sm text-blue-800">{answer.feedback}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}