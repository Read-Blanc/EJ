import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Clock, CheckCircle2,
  BarChart3, FileText, Plus, TrendingUp,
  ArrowRight, Sparkles, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lecturerApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await lecturerApi.getDashboard();
      // Extract stats from nested structure
      const stats = res?.statistics || res || {};
      setData({
        pendingReviews: stats.pending_reviews ?? 0,
        gradedToday: stats.graded_today ?? 0,
        activeStudents: stats.active_students ?? stats.total_students ?? 0,
        avgConfidence: stats.avg_confidence ?? 0,
        totalQuestions: stats.total_questions ?? 0,
        totalAssessments: stats.total_assessments ?? 0,
        recentActivity: stats.recent_activity ?? [],
      });
    } catch {
      // Honest empty state — no mock data
      setData({
        pendingReviews: 0, gradedToday: 0,
        activeStudents: 0, avgConfidence: 0,
        totalQuestions: 0, totalAssessments: 0,
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  const firstName = (user?.full_name || user?.username || '').split(' ')[0];
  const isNew = data.totalQuestions === 0 && data.totalAssessments === 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-gray-900">
              {getGreeting()}, {firstName} 👋
            </motion.h1>
            <p className="text-gray-500 mt-1">
              {isNew ? "Let's get your first assessment set up." : "Here's what's happening today."}
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/lecturer/assessments/create')}
            className="flex items-center gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" /> Create Assessment
          </Button>
        </div>

        {/* New lecturer onboarding callout */}
        {isNew && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="mb-8 border-brand-200 bg-gradient-to-r from-brand-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Welcome to EvalAI</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Get started by building your question bank, then create an assessment to publish to students.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary" asChild>
                        <Link to="/lecturer/questions/create" className="flex items-center gap-1.5 text-sm">
                          <Plus className="w-3.5 h-3.5" /> Add a question
                        </Link>
                      </Button>
                      <Button variant="secondary" asChild>
                        <Link to="/lecturer/assessments/create" className="flex items-center gap-1.5 text-sm">
                          <FileText className="w-3.5 h-3.5" /> Create assessment
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Clock className="w-5 h-5" />,      label: 'Pending Reviews', value: data.pendingReviews,  color: 'orange', href: '/lecturer/grading' },
            { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Graded Today',   value: data.gradedToday,    color: 'green' },
            { icon: <Users className="w-5 h-5" />,       label: 'Active Students', value: data.activeStudents,  color: 'blue',  href: '/lecturer/students' },
            { icon: <TrendingUp className="w-5 h-5" />,   label: 'AI Confidence',  value: data.avgConfidence ? `${data.avgConfidence}%` : '—', color: 'purple' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              {s.href ? (
                <Link to={s.href}><StatCard {...s} /></Link>
              ) : <StatCard {...s} />}
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: <BookOpen className="w-7 h-7" />, title: 'Question Bank', desc: `${data.totalQuestions} question${data.totalQuestions !== 1 ? 's' : ''} created`, href: '/lecturer/questions', color: 'blue', cta: data.totalQuestions === 0 ? 'Add questions' : 'Manage' },
            { icon: <FileText className="w-7 h-7" />, title: 'Assessments', desc: `${data.totalAssessments} assessment${data.totalAssessments !== 1 ? 's' : ''} created`, href: '/lecturer/assessments', color: 'green', cta: data.totalAssessments === 0 ? 'Create one' : 'Manage' },
            { icon: <BarChart3 className="w-7 h-7" />, title: 'Analytics', desc: data.activeStudents > 0 ? `${data.activeStudents} students tracked` : 'No data yet', href: '/lecturer/analytics', color: 'purple', cta: 'View insights' },
          ].map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
              <ActionCard {...a} />
            </motion.div>
          ))}
        </div>

        {/* Pending reviews alert */}
        {data.pendingReviews > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-900 text-sm">
                      {data.pendingReviews} submission{data.pendingReviews !== 1 ? 's' : ''} awaiting your review
                    </p>
                    <p className="text-xs text-orange-700 mt-0.5">Students are waiting for their feedback</p>
                  </div>
                </div>
                <Button variant="primary" asChild className="flex-shrink-0 bg-orange-600 hover:bg-orange-700">
                  <Link to="/lecturer/grading" className="flex items-center gap-2 text-sm">
                    Review now <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity?.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No activity yet</p>
                <p className="text-xs text-gray-400 mt-1">Submissions, reviews and events will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{a.message || a.description}</p>
                    <span className="text-xs text-gray-400 ml-auto">{a.time || a.created_at}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-5">
        <div className={`w-9 h-9 ${colors[color]} rounded-xl flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ icon, title, desc, href, color, cta }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <Link to={href}>
      <Card className="h-full hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
        <CardContent className="p-6">
          <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-4`}>
            {icon}
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 mb-3">{desc}</p>
          <span className="text-xs font-semibold text-brand-600 flex items-center gap-1">
            {cta} <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}