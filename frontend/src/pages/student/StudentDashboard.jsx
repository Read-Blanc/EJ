import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, TrendingUp, Clock, Award,
  ArrowRight, Calendar, Target, Sparkles,
  FileText, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // null = not loaded yet

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await studentApi.getDashboard();
      setData(res);
    } catch {
      // Backend unavailable — show honest empty state, NOT mock data
      setData({
        stats: { totalAssessments: 0, completedAssessments: 0, averageScore: 0, upcomingCount: 0 },
        recentResults: [],
        upcomingAssessments: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  const { stats, recentResults = [], upcomingAssessments = [] } = data || {};
  const hasActivity = stats?.completedAssessments > 0;
  const firstName = (user?.full_name || user?.username || '').split(' ')[0];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8">
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {firstName} 👋
          </motion.h1>
          <p className="text-gray-500 mt-1">
            {hasActivity
              ? "Here's your academic performance overview."
              : "You haven't taken any assessments yet. Let's get started."}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <BookOpen className="w-5 h-5" />, label: 'Available', value: stats?.totalAssessments ?? 0, color: 'blue', sub: 'assessments' },
            { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Completed', value: stats?.completedAssessments ?? 0, color: 'green', sub: 'submitted' },
            { icon: <Award className="w-5 h-5" />, label: 'Average Score', value: hasActivity ? `${stats?.averageScore ?? 0}%` : '—', color: 'purple', sub: hasActivity ? 'across all tests' : 'no data yet' },
            { icon: <Clock className="w-5 h-5" />, label: 'Upcoming', value: stats?.upcomingCount ?? 0, color: 'orange', sub: 'due soon' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* No activity callout */}
        {!hasActivity && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="mb-8 border-brand-200 bg-gradient-to-r from-brand-50 to-white">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-7 h-7 text-brand-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">No assessments taken yet</h3>
                  <p className="text-sm text-gray-500">Browse available assessments and start building your academic record.</p>
                </div>
                <Button variant="primary" asChild className="flex-shrink-0">
                  <Link to="/student/assessments" className="flex items-center gap-2">
                    Browse Assessments <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Results */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Recent Results
              </CardTitle>
              {recentResults.length > 0 && (
                <Link to="/student/results" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {recentResults.length === 0 ? (
                <EmptySection
                  icon={<FileText className="w-8 h-8" />}
                  title="No results yet"
                  desc="Your completed assessment results will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {recentResults.slice(0, 4).map((r, i) => {
                    const pct = r.percentage ?? Math.round((r.score / r.max_score) * 100);
                    return (
                      <Link key={r.id} to={`/student/results/${r.id}`}>
                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.assessment_title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.subject}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                              pct >= 70 ? 'bg-green-100 text-green-700' :
                              pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>{pct}%</div>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Assessments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" /> Upcoming Assessments
              </CardTitle>
              {upcomingAssessments.length > 0 && (
                <Link to="/student/assessments" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {upcomingAssessments.length === 0 ? (
                <EmptySection
                  icon={<Calendar className="w-8 h-8" />}
                  title="No upcoming assessments"
                  desc="When your lecturers publish new assessments, they'll show up here."
                  action={<Link to="/student/assessments"><Button variant="secondary" className="mt-3 text-xs">Browse available</Button></Link>}
                />
              ) : (
                <div className="space-y-3">
                  {upcomingAssessments.slice(0, 4).map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                      <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <Clock className="w-3 h-3" />{a.durationMinutes ?? a.duration_minutes} min
                          <span>·</span>
                          <Target className="w-3 h-3" />{a.totalMarks ?? a.total_marks} marks
                        </div>
                      </div>
                      <Button size="sm" variant="primary" asChild className="flex-shrink-0 text-xs py-1.5 px-3">
                        <Link to={`/student/assessments/${a.id}`}>Start</Link>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance teaser — only if there's data */}
        {hasActivity && (
          <Card className="mt-6">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Performance Analytics</h3>
                  <p className="text-sm text-gray-500">View your score trends and subject breakdowns</p>
                </div>
              </div>
              <Button variant="secondary" asChild>
                <Link to="/student/performance" className="flex items-center gap-2">
                  View Performance <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, sub }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  };
  const c = colors[color] || colors.blue;
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center ${c.icon} mb-3`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptySection({ icon, title, desc, action }) {
  return (
    <div className="text-center py-8">
      <div className="text-gray-200 flex justify-center mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">{desc}</p>
      {action}
    </div>
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