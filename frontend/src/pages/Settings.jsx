import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';

export default function Settings() {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [fullName,     setFullName]     = useState(user?.fullName ?? '');
  const [newPassword,  setNewPassword]  = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState('');
  const [toastType,    setToastType]    = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id);

    setSaving(false);
    if (error) { showToast('Failed to update name.', 'error'); return; }
    setUser(prev => ({ ...prev, fullName: fullName.trim() }));
    showToast('Profile updated successfully.');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    if (newPassword !== confirmPass) { showToast('Passwords do not match.', 'error'); return; }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) { showToast(error.message, 'error'); return; }
    setNewPassword(''); setConfirmPass('');
    showToast('Password changed successfully.');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">Settings</div>
      </div>

      <div className="p-6 max-w-2xl space-y-5">

        {/* Profile card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Profile</h2>

          {/* Avatar strip */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{user?.fullName || user?.email}</div>
              <div className="text-sm text-gray-400 capitalize">{user?.role}</div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
              <input
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name" required
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
              <input
                type="email" value={user?.email ?? ''} disabled
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
            </div>
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change password card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: 'New Password',     id: 'pw',  value: newPassword, onChange: setNewPassword,  placeholder: 'Min. 8 characters' },
              { label: 'Confirm Password', id: 'cpw', value: confirmPass, onChange: setConfirmPass,  placeholder: 'Repeat new password' },
            ].map(({ label, id, value, onChange, placeholder }) => (
              <div key={id}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                <input
                  id={id} type="password" value={value} placeholder={placeholder}
                  onChange={(e) => onChange(e.target.value)} required
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
              </div>
            ))}
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-red-100 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Sign Out</h2>
          <p className="text-sm text-gray-400 mb-4">You'll be returned to the landing page.</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-md hover:bg-red-50 transition"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium px-6 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap ${
          toastType === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast}
        </div>
      )}
    </div>
  );
}