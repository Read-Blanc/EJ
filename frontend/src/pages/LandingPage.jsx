import { useNavigate, Link } from 'react-router-dom';

const FEATURES = [
  { icon: '🧠', title: 'Semantic Analysis',     desc: 'Uses SBERT to understand context and meaning, ensuring grades reflect true understanding.' },
  { icon: '📋', title: 'Rubric-based Scoring',  desc: 'Evaluates accuracy, completeness, and clarity for consistent, fair results every time.' },
  { icon: '💬', title: 'Detailed Feedback',     desc: 'Generates constructive feedback automatically so students learn from mistakes immediately.' },
  { icon: '📈', title: 'Performance Analytics', desc: 'Track progress over time with dashboards for individual students and entire classes.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="w-9 h-9 bg-gray-900 text-white text-xs font-bold flex items-center justify-center rounded-md">
            EvalAI
          </div>

          {/* Nav links */}
          <ul className="hidden md:flex items-center gap-8 ml-12 flex-1">
            {['Home', 'Features', 'Analytics', 'Support'].map(l => (
              <li key={l}>
                <a href={`#${l.toLowerCase()}`} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">{l}</a>
              </li>
            ))}
          </ul>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 transition"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section id="home" className="py-24 px-6 text-center bg-white">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-4 py-2 rounded-full mb-6 tracking-wide">
            Interactive, SBERT-powered assessment
          </span>
          <h1 className="text-5xl font-bold text-black leading-tight mb-6">
            Intelligent Assessment<br />Beyond Keywords
          </h1>
          <p className="text-base text-gray-500 leading-relaxed mb-3">
            EvalAI uses Sentence-BERT to evaluate theory answers based on meaning, not just keyword matching.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Role-specific sections are designed to stay clear and readable on desktops, tablets, and mobile devices.
          </p>
        </div>
      </section>

      {/* ── Role cards ───────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">

          {/* Student card */}
          <div className="border border-gray-200 rounded-xl p-8 flex flex-col hover:border-gray-300 hover:shadow-md transition-all duration-200">
            <div className="w-16 h-16 bg-gray-100 rounded-lg mb-5 flex items-center justify-center text-3xl">🎓</div>
            <h2 className="text-xl font-semibold text-black mb-3">I am a Student</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Personalized workspace with assessments and feedback tailored to you.
            </p>
            <ul className="flex-1 mb-6">
              <li className="text-sm text-gray-500 leading-relaxed">
                Access upcoming assessments, see rubric-based scores, and review detailed feedback that explains how your answers were evaluated.
              </li>
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition mb-3"
            >
              Go to Assessments
            </button>
            <Link to="/login" className="block text-center text-sm text-indigo-600 hover:underline mb-4">
              View Past Results
            </Link>
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 leading-relaxed">
              Tip: After you sign in, this area updates with your active and completed assessments.
            </p>
          </div>

          {/* Lecturer card */}
          <div className="border border-gray-200 rounded-xl p-8 flex flex-col hover:border-gray-300 hover:shadow-md transition-all duration-200">
            <div className="w-16 h-16 bg-gray-100 rounded-lg mb-5 flex items-center justify-center text-3xl">📚</div>
            <h2 className="text-xl font-semibold text-black mb-3">I am a Lecturer</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Role-aware dashboard for question design, grading, and analytics.
            </p>
            <ul className="flex-1 mb-6">
              <li className="text-sm text-gray-500 leading-relaxed">
                Create and manage question banks, configure rubrics, and monitor automated grading at scale. Drill into cohort performance with analytics designed for secure, evidence-based evaluation.
              </li>
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition mb-3"
            >
              Manage Assessments
            </button>
            <Link to="/login" className="block text-center text-sm text-indigo-600 hover:underline mb-4">
              View Class Analytics
            </Link>
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 leading-relaxed">
              Tip: Once authenticated, you'll have course-specific analytics and board activity here.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-black text-center mb-3">Trustworthy Automated Evaluation</h2>
          <p className="text-sm text-gray-500 text-center mb-12">Built for accuracy, transparency, and academic integrity.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map(f => (
              <div key={f.title} className="text-center">
                <div className="w-14 h-14 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center text-2xl shadow-sm">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-black mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} EvalAI. All rights reserved.
      </footer>
    </div>
  );
}