import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

/**
 * OAuth callback page — Supabase redirects here after Google sign-in.
 * The URL contains a session token that Supabase exchanges automatically
 * via onAuthStateChange in App.jsx. We just wait, hydrate, then redirect.
 */
export default function OAuth() {
  const { setUser } = useContext(AuthContext);
  const navigate    = useNavigate();

  useEffect(() => {
    const handle = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Something went wrong — send back to login
        navigate('/login', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

      const role     = profile?.role     ?? session.user.user_metadata?.role;
      const fullName = profile?.full_name ?? session.user.user_metadata?.full_name ?? '';

      if (!role) {
        navigate('/login', { replace: true });
        return;
      }

      setUser({ id: session.user.id, email: session.user.email, fullName, role, isAuthenticated: true });
      navigate(role === 'lecturer' ? '/lecturer' : '/student', { replace: true });
    };

    handle();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  );
}