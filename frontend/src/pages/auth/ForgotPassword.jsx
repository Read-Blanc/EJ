import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between">
        {/* Logo matches sidebar — gray-950 */}
        <Link to="/" className="text-base font-bold text-white bg-gray-950 px-3 py-1.5 rounded-lg">EvalAI</Link>
        <p className="text-sm text-gray-500">
          Remember your password?{' '}
          <Link to="/login" className="text-gray-900 font-semibold hover:underline underline-offset-2">Sign in</Link>
        </p>
      </nav>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 text-2xl flex items-center justify-center mx-auto mb-4">✉️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-5">
                We sent a reset link to <strong>{email}</strong>. Click it to set a new password.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-gray-600 font-medium hover:text-gray-900 hover:underline underline-offset-2 transition"
              >
                Didn't receive it? Try again
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Forgot password?</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email" value={email} required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-gray-950 text-white text-sm font-bold py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : 'Send Reset Link →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}