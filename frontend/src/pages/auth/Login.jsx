import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const SLIDES = [
  {
    img:     'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    alt:     'Students studying together in a university library',
    tag:     'AI-Powered Grading',
    title:   'Semantic understanding.\nInstant feedback.',
    caption: 'SBERT evaluates answers by meaning — not keywords. Consistent, fair, explainable results every time.',
  },
  {
    img:     'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    alt:     'Open books and laptop on a university desk',
    tag:     'Performance Analytics',
    title:   'See every student.\nAt a glance.',
    caption: 'Drill into cohort performance, track score distributions, and spot struggling students early.',
  },
  {
    img:     'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    alt:     'Lecturer presenting to a classroom',
    tag:     'Academic Integrity',
    title:   'Fair for everyone.\nAlways.',
    caption: 'No keyword stuffing, no bias. Every submission evaluated against the same semantic rubric.',
  },
];

function LeftPanel() {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const goTo = (i) => {
    setIdx(i);
    // Reset the auto-advance timer when user manually clicks
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx(cur => (cur + 1) % SLIDES.length), 5000);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx(cur => (cur + 1) % SLIDES.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="hidden lg:flex w-[520px] shrink-0 relative overflow-hidden flex-col">
      {/* All images stacked — CSS crossfade, zero blank gap */}
      {SLIDES.map((s, i) => (
        <img
          key={s.img}
          src={s.img}
          alt={s.alt}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />

      {/* Top logo */}
      <div className="absolute top-10 left-10 z-10">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-tight drop-shadow">EvalAI</span>
        </Link>
      </div>

      {/* Bottom text — always visible, content crossfades */}
      <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
        <div className="relative" style={{ minHeight: '120px' }}>
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: i === idx ? 1 : 0, pointerEvents: i === idx ? 'auto' : 'none' }}
            >
              <span className="inline-block text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-3">
                {s.tag}
              </span>
              <h2 className="text-[26px] font-bold text-white leading-tight whitespace-pre-line mb-3">
                {s.title}
              </h2>
              <p className="text-[14px] text-white/70 leading-relaxed max-w-[320px]">
                {s.caption}
              </p>
            </div>
          ))}
        </div>

        {/* Dot indicators — larger hit target, pill for active */}
        <div className="flex items-center gap-2 mt-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full bg-white transition-all duration-300 focus:outline-none"
              style={{
                width:   i === idx ? '24px' : '8px',
                height:  '8px',
                opacity: i === idx ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate    = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setLoading(false); setError(signInError.message); return; }
    const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', data.user.id).single();
    const role     = profile?.role     ?? data.user.user_metadata?.role;
    const fullName = profile?.full_name ?? data.user.user_metadata?.full_name ?? '';
    setLoading(false);
    if (!role) { setError('Could not determine your role. Please contact support.'); return; }
    setUser({ id: data.user.id, email: data.user.email, fullName, role, isAuthenticated: true });
    navigate(role === 'lecturer' ? '/lecturer' : '/student');
  };

  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <LeftPanel />

      {/* Right form */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <Link to="/" className="lg:hidden font-bold text-gray-900">EvalAI</Link>
          <div className="ml-auto text-sm text-gray-500">
            New to EvalAI?{' '}
            <Link to="/signup" className="text-gray-900 font-semibold hover:underline underline-offset-2">
              Create account
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[380px]">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Welcome back</h1>
              <p className="text-sm text-gray-400">Sign in to your EvalAI account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  <span className="shrink-0">⚠</span><span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@university.edu" required autoComplete="email"
                  className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 bg-white text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-gray-900 transition hover:underline underline-offset-2">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 bg-white text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200" />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition uppercase tracking-wide">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold bg-gray-950 text-white hover:bg-gray-800 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In →'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              By signing in you agree to our{' '}
              <a href="#terms" className="text-gray-600 hover:text-gray-900 transition underline underline-offset-2">Terms</a>
              {' '}and{' '}
              <a href="#privacy" className="text-gray-600 hover:text-gray-900 transition underline underline-offset-2">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}