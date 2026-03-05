import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// ── Static mock data (replace with Supabase queries as needed) ────────────
const STATS = [
  { label: 'Total Questions', value: '48', delta: '+3 this week',        deltaType: 'up',   icon: '❓', accent: 'linear-gradient(90deg,#667eea,#764ba2)' },
  { label: 'Pending Scripts', value: '12', delta: '4 flagged for review', deltaType: 'down', icon: '⏳', accent: '#f59e0b' },
  { label: 'Avg. Score',      value: '73%', delta: '+2% vs last week',   deltaType: 'up',   icon: '📊', accent: '#10b981' },
  { label: 'Active Assessments', value: '3', delta: '1 closing soon',    deltaType: 'none', icon: '📝', accent: '#3b82f6' },
];

const QUEUE_SNAPSHOT = [
  { id: 'S-001', student: 'Alice Okafor',   assessment: 'CS-401 Midterm', score: 0.82, status: 'Needs Review', color: '#6366f1', initials: 'AO' },
  { id: 'S-002', student: 'Ben Mensah',     assessment: 'CS-401 Midterm', score: 0.61, status: 'Needs Review', color: '#ec4899', initials: 'BM' },
  { id: 'S-003', student: 'Cleo Darko',     assessment: 'Data Structures', score: 0.91, status: 'Auto-graded', color: '#10b981', initials: 'CD' },
  { id: 'S-004', student: 'David Agyei',    assessment: 'Data Structures', score: 0.44, status: 'Needs Review', color: '#f59e0b', initials: 'DA' },
];

const ACTIVITY = [
  { text: 'Alice Okafor submitted CS-401 Midterm',    bold: 'Alice Okafor',   time: '2 min ago',  color: '#6366f1' },
  { text: 'You published Data Structures Quiz',        bold: 'Data Structures Quiz', time: '1 hr ago',  color: '#10b981' },
  { text: 'Ben Mensah joined CS-401 Midterm',         bold: 'Ben Mensah',     time: '3 hrs ago',  color: '#ec4899' },
  { text: 'AI grading completed for CS-301 Finals',   bold: 'CS-301 Finals',  time: 'Yesterday',  color: '#f59e0b' },
];

const SCORE_DIST = [
  { label: '90–100%', pct: 18, count: 9,  fill: '#10b981' },
  { label: '75–89%',  pct: 42, count: 21, fill: '#6366f1' },
  { label: '60–74%',  pct: 24, count: 12, fill: '#f59e0b' },
  { label: 'Below 60%', pct: 16, count: 8, fill: '#ef4444' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function scoreChipColor(score) {
  if (score >= 0.8) return 'bg-green-100 text-green-700';
  if (score >= 0.6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function ActivityText({ text, bold }) {
  const idx = text.indexOf(bold);
  if (idx === -1) return <span>{text}</span>;
  return <span>{text.slice(0, idx)}<strong>{bold}</strong>{text.slice(idx + bold.length)}</span>;
}

export default function LecturerDashboard() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const firstName = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const pendingCount = QUEUE_SNAPSHOT.filter(i => i.status === 'Needs Review').length;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <span>Home</span><span>/</span><span className="text-gray-700 font-medium">Dashboard</span>
        </nav>
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-gray-400 hover:text-gray-700 transition" title="Notifications">
            🔔
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button
            onClick={() => navigate('/lecturer/grading')}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
          >
            Start Grading
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div>
          <div className="text-xl font-bold text-gray-900">Good {greeting()}, {firstName} 👋</div>
          <div className="text-sm text-gray-400 mt-0.5">Here's what's happening across your assessments today.</div>
          <div className="text-xs text-gray-300 mt-1">{today}</div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: s.accent }} />
              <div className="text-2xl mb-3">{s.icon}</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
              <div className={`text-xs font-medium ${s.deltaType === 'up' ? 'text-emerald-500' : s.deltaType === 'down' ? 'text-amber-500' : 'text-gray-400'}`}>
                {s.deltaType === 'up' && '↑ '}{s.deltaType === 'down' && '↓ '}{s.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Mid row: Grading Queue + Activity */}
        <div className="grid grid-cols-2 gap-4">
          {/* Grading queue snapshot */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Grading Queue</div>
                <div className="text-xs text-gray-400">Scripts awaiting review</div>
              </div>
              <button onClick={() => navigate('/lecturer/grading')} className="text-xs text-indigo-600 hover:underline">View all →</button>
            </div>
            {QUEUE_SNAPSHOT.map(item => (
              <div
                key={item.id}
                onClick={() => navigate('/lecturer/grading')}
                className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: item.color }}>
                  {item.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.student}</div>
                  <div className="text-xs text-gray-400 truncate">{item.assessment} · #{item.id}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreChipColor(item.score)}`}>
                  {item.score.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="px-5 py-3">
              <button
                onClick={() => navigate('/lecturer/grading')}
                className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
              >
                Start Grading ({pendingCount} pending)
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">Recent Activity</div>
            </div>
            <div className="divide-y divide-gray-50">
              {ACTIVITY.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
                  <div>
                    <div className="text-sm text-gray-700"><ActivityText text={item.text} bold={item.bold} /></div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Score distribution + Quick actions */}
        <div className="grid grid-cols-3 gap-4">
          {/* Score distribution — spans 2 cols */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">Score Distribution</div>
              <div className="text-xs text-gray-400">CS-401 Midterm · 50 submissions</div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {SCORE_DIST.map(bar => (
                <div key={bar.label} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-500 font-medium shrink-0">{bar.label}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${bar.pct}%`, background: bar.fill }} />
                  </div>
                  <div className="w-6 text-xs text-gray-400 text-right">{bar.count}</div>
                </div>
              ))}
              <div className="text-xs text-gray-400 pt-1">50 total submissions · Pass rate: 84%</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">Quick Actions</div>
            </div>
            <div className="p-3 space-y-2">
              {[
                { icon: '➕', label: 'New Assessment',  desc: 'Create and publish',      to: '/lecturer/assessments' },
                { icon: '✏️', label: 'Question Bank',   desc: 'Manage questions',         to: '/lecturer/questions'   },
                { icon: '📊', label: 'Analytics',       desc: 'View class performance',   to: '/lecturer/analytics'   },
                { icon: '👥', label: 'Students',        desc: 'View enrolled students',   to: '/lecturer/students'    },
              ].map(qa => (
                <button
                  key={qa.label}
                  onClick={() => navigate(qa.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base shrink-0">{qa.icon}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{qa.label}</div>
                    <div className="text-xs text-gray-400">{qa.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}