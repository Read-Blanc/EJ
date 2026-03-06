import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setLoading(false); setError(updateError.message); return; }

    await supabase.auth.signOut();
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate('/login'), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-6 h-14 flex items-center">
        <Link to="/" className="text-base font-bold text-white bg-gray-950 px-3 py-1.5 rounded-lg">EvalAI</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-gray-500">Your password has been changed. Redirecting to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password — at least 8 characters.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} placeholder="Min. 8 characters" required
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 hover:border-gray-400 focus:border-gray-900 rounded-xl px-4 py-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition uppercase tracking-wide">
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirm Password</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm} placeholder="Repeat new password" required
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 transition-all ${
                      confirm && confirm !== password
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 hover:border-gray-400 focus:border-gray-900'
                    }`}
                  />
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-gray-950 text-white text-sm font-bold py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : 'Update Password →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}