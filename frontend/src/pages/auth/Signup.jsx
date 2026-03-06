import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const SLIDES = [
  {
    img:     'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1200&q=80',
    alt:     'Student writing exam answers at a desk',
    tag:     'For Students',
    title:   'Submit. Learn.\nImprove.',
    caption: 'Take assessments, get instant AI-generated feedback, and track how your scores evolve over time.',
  },
  {
    img:     'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    alt:     'Lecturer presenting at the front of a classroom',
    tag:     'For Lecturers',
    title:   'Build. Publish.\nGrade at scale.',
    caption: 'Create assessments, share access codes, and let AI handle the grading while you focus on teaching.',
  },
  {
    img:     'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80',
    alt:     'University students collaborating over laptops',
    tag:     'Free to join',
    title:   'Get started\nin minutes.',
    caption: "No credit card, no setup hassle. Create your account and you're ready from day one.",
  },
];

const ROLES = [
  { value: 'student',  icon: '🎓', label: 'Student' },
  { value: 'lecturer', icon: '📚', label: 'Lecturer' },
];

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  return { score, ...[
    { label: 'Too short', color: '#ef4444' },
    { label: 'Weak',      color: '#f97316' },
    { label: 'Fair',      color: '#eab308' },
    { label: 'Good',      color: '#22c55e' },
    { label: 'Strong',    color: '#111827' },
  ][score] };
}

function LeftPanel() {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const goTo = (i) => {
    setIdx(i);
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

      {/* Bottom text — content crossfades without any blank period */}
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

        {/* Dot indicators — larger, better hit target */}
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

export default function Signup() {
  const { setUser } = useContext(AuthContext);
  const navigate    = useNavigate();

  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [role,            setRole]            = useState('student');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [agreedToTerms,   setAgreedToTerms]   = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [loading,         setLoading]         = useState(false);

  const strength = passwordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 8)         return setError('Password must be at least 8 characters.');
    if (!agreedToTerms)              return setError('You must agree to the Terms of Service.');
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName, role } },
    });
    setLoading(false);
    if (signUpError) return setError(signUpError.message);
    if (data.session) {
      setUser({ id: data.user.id, email, fullName, role, isAuthenticated: true });
      navigate(role === 'lecturer' ? '/lecturer' : '/student');
    } else {
      setSuccess('Check your email and click the verification link to activate your account.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <LeftPanel />

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <Link to="/" className="lg:hidden font-bold text-gray-900">EvalAI</Link>
          <div className="ml-auto text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline underline-offset-2">Sign in</Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-10 overflow-y-auto">
          <div className="w-full max-w-[400px]">
            {success ? (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto text-2xl">✉️</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">{success}</p>
                </div>
                <button onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gray-950 text-white hover:bg-gray-800 transition-all">
                  Go to Sign In →
                </button>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Create your account</h1>
                  <p className="text-sm text-gray-400">Free to get started — no card required</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                      <span className="shrink-0">⚠</span><span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">I am a</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map(r => (
                        <button key={r.value} type="button" onClick={() => setRole(r.value)}
                          className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 ${role === r.value
                            ? 'bg-gray-950 border-gray-950 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'}`}>
                          <span>{r.icon}</span>
                          <span className="text-[13px] font-semibold">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Jane Doe" required autoComplete="name"
                      className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 bg-white text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@university.edu" required autoComplete="email"
                      className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 bg-white text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters" required autoComplete="new-password"
                        className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 bg-white text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition uppercase tracking-wide">
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <div key={n} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: strength.score >= n ? strength.color : '#e5e7eb' }} />
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirm Password</label>
                    <input type={showPass ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password" required autoComplete="new-password"
                      className={`w-full border hover:border-gray-400 focus:border-gray-900 bg-white text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all ${
                        confirmPassword && confirmPassword !== password ? 'border-red-300' : 'border-gray-200'}`} />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                    )}
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div onClick={() => setAgreedToTerms(v => !v)}
                      className={`w-4 h-4 mt-0.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-gray-950 border-gray-950' : 'bg-white border-gray-300 group-hover:border-gray-500'}`}>
                      {agreedToTerms && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-sm text-gray-500 leading-snug">
                      I agree to the{' '}
                      <a href="#terms" className="text-gray-800 font-medium hover:underline underline-offset-2">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#privacy" className="text-gray-800 font-medium hover:underline underline-offset-2">Privacy Policy</a>
                    </span>
                  </label>

                  <button type="submit" disabled={loading || !agreedToTerms}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-gray-950 text-white hover:bg-gray-800 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account…
                      </span>
                    ) : 'Create Account →'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}