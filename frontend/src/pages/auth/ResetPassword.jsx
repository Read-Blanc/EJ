import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
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
        <Link to="/" className="text-lg font-bold text-white bg-gray-800 px-3 py-1.5 rounded-md">EvalAI</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 text-2xl flex items-center justify-center mx-auto mb-4">✓</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-gray-500">Your password has been changed. Redirecting to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password — at least 8 characters.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>
                )}
                {[
                  { label: 'New Password', id: 'password', value: password, onChange: setPassword, placeholder: 'Min. 8 characters' },
                  { label: 'Confirm Password', id: 'confirm', value: confirm, onChange: setConfirm, placeholder: 'Repeat new password' },
                ].map(({ label, id, value, onChange, placeholder }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      id={id} type="password" value={value} placeholder={placeholder} required
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                ))}
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}