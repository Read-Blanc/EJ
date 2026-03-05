import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate    = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    const role     = profile?.role     ?? data.user.user_metadata?.role;
    const fullName = profile?.full_name ?? data.user.user_metadata?.full_name ?? '';

    setLoading(false);

    if (!role) {
      setError('Could not determine your role. Please contact support.');
      return;
    }

    setUser({ id: data.user.id, email: data.user.email, fullName, role, isAuthenticated: true });
    navigate(role === 'lecturer' ? '/lecturer' : '/student');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-gray-900 bg-gray-800 text-white px-3 py-1.5 rounded-md">
          EvalAI
        </Link>
        <p className="text-sm text-gray-500">
          New to EvalAI?{' '}
          <Link to="/signup" className="text-indigo-600 font-medium hover:underline">Sign up</Link>
        </p>
      </nav>

      {/* Two-column layout */}
      <div className="flex flex-1">
        {/* Form side */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-8">Sign in to your EvalAI account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        {/* Info side */}
        <div className="hidden md:flex w-[420px] bg-gray-900 text-white flex-col justify-center px-12">
          <h2 className="text-2xl font-bold mb-6">AI-powered grading at scale</h2>
          <ul className="space-y-4 text-sm text-gray-300">
            {[
              'SBERT semantic understanding for nuanced answers',
              'Instant, consistent feedback every submission',
              'Detailed analytics to track class progress',
              'Secure platform built for academic integrity',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-indigo-400">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}