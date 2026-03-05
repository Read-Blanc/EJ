import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, Award,
  BookOpen, Target, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { lecturerApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { toast } from 'sonner';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await lecturerApi.getAnalytics();
        setData(res || null);
      } catch {
        toast.error('Failed to load analytics');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const {
    overview = {},
    scoreDistribution = [],
    subjectPerformance = [],
    topStudents = [],
    challengingQuestions = [],
    weeklyActivity = [],
  } = data;

  const maxDist = scoreDistribution.length ? Math.max(...scoreDistribution.map(d => d.count)) : 1;
  const maxActivity = weeklyActivity.length ? Math.max(...weeklyActivity.map(w => w.submissions)) : 1;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Performance insights across all assessments</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['all', 'month', 'week'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : 'This Week'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Students', value: overview.totalStudents ?? 0, icon: <Users className="w-5 h-5" />, color: 'from-blue-500 to-blue-600' },
            { label: 'Assessments', value: overview.totalAssessments ?? 0, icon: <BookOpen className="w-5 h-5" />, color: 'from-brand-500 to-brand-700' },
            { label: 'Submissions', value: overview.totalSubmissions ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: 'from-green-500 to-green-600' },
            { label: 'Avg Score', value: overview.avgScore ? `${overview.avgScore}%` : '—', icon: <Target className="w-5 h-5" />, color: 'from-purple-500 to-purple-700' },
            { label: 'Pass Rate', value: overview.passRate ? `${overview.passRate}%` : '—', icon: <Award className="w-5 h-5" />, color: 'from-orange-500 to-orange-600' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-3`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Score Distribution + Weekly Activity */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-600" /> Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scoreDistribution.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No submission data yet</p>
              ) : (
                <div className="space-y-3">
                  {scoreDistribution.map((band, i) => (
                    <div key={band.band} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-14 flex-shrink-0">{band.band}</span>
                      <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(band.count / maxDist) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                          className="h-full rounded-lg flex items-center justify-end pr-2"
                          style={{ backgroundColor: band.color || '#6366f1' }}>
                          <span className="text-xs font-bold text-white">{band.count}</span>
                        </motion.div>
                      </div>
                      <span className="text-xs text-gray-400 w-10">
                        {Math.round((band.count / scoreDistribution.reduce((s, b) => s + b.count, 0)) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-600" /> Submission Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {weeklyActivity.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No activity data yet</p>
              ) : (
                <div className="flex items-end gap-3 h-40">
                  {weeklyActivity.map((w, i) => (
                    <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">{w.submissions}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(w.submissions / maxActivity) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }}
                        className="w-full rounded-t-lg min-h-[4px]"
                        style={{ background: 'linear-gradient(to top, #7c3aed, #a855f7)' }} />
                      <span className="text-xs text-gray-500 text-center leading-tight">{w.week}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" /> Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjectPerformance.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No subject data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Subject</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Avg Score</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Submissions</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectPerformance.map((s, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 px-3 font-medium text-gray-900">{s.subject}</td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span className={s.avgScore >= 70 ? 'text-green-600' : s.avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                            {s.avgScore}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600">{s.submissions}</td>
                        <td className="py-3 px-3 text-right text-gray-600">{s.passRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Students + Challenging Questions */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" /> Top Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topStudents.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No student data yet</p>
              ) : (
                <div className="space-y-3">
                  {topStudents.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.id} · {s.assessments} assessments</p>
                      </div>
                      <span className="text-sm font-bold text-green-600">{s.avg}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Most Challenging Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {challengingQuestions.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
              ) : (
                <div className="space-y-4">
                  {challengingQuestions.map((q, i) => (
                    <div key={i} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                      <p className="text-sm text-gray-800 font-medium mb-1.5 line-clamp-2">{q.text}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{q.subject}</span>
                        <span className="text-xs font-semibold text-orange-600">{q.avgScore}/{q.maxScore} avg</span>
                      </div>
                      <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(q.avgScore / q.maxScore) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen"><Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading analytics…</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-screen"><Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No analytics yet</h3>
          <p className="text-gray-500 text-sm">Analytics will appear once students start submitting assessments.</p>
        </div>
      </div>
    </div>
  );
}