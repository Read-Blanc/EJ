import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * NotificationBell
 *
 * Props:
 *   notifications  — array from useNotifications
 *   unreadCount    — number
 *   markRead       — fn(id)
 *   markAllRead    — fn()
 *   clearAll       — fn()
 */
export default function NotificationBell({ notifications, unreadCount, markRead, markAllRead, clearAll }) {
  const [open, setOpen]               = useState(false);
  const [toastQueue, setToastQueue]   = useState([]);
  const panelRef                      = useRef(null);
  const prevCountRef                  = useRef(unreadCount);
  const navigate                      = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Bubble up a toast strip whenever a new notification arrives
  useEffect(() => {
    if (notifications.length === 0) return;
    const newest = notifications[0];
    if (!newest.read && newest.ts > Date.now() - 500) {
      const toastId = newest.id;
      setToastQueue(q => [...q, toastId]);
      setTimeout(() => setToastQueue(q => q.filter(x => x !== toastId)), 4000);
    }
  // Only run when the leading notification changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications[0]?.id]);

  const handleClick = (notif) => {
    markRead(notif.id);
    setOpen(false);
    if (notif.href) navigate(notif.href);
  };

  const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)   return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <>
      {/* ── Toast strip (bottom-right corner) ─────────────────── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100] pointer-events-none">
        {toastQueue.map(tid => {
          const n = notifications.find(x => x.id === tid);
          if (!n) return null;
          return (
            <div key={tid}
              className="pointer-events-auto flex items-start gap-3 bg-gray-950 text-white text-sm px-4 py-3 rounded-xl shadow-2xl max-w-[320px]"
              style={{ animation: 'slideInRight 0.25s ease' }}>
              <span className="text-base leading-none mt-0.5">{n.icon}</span>
              <div>
                <div className="font-semibold text-xs text-gray-400 uppercase tracking-wide">{n.title}</div>
                <div className="mt-0.5 leading-snug">{n.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bell button ──────────────────────────────────────────── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
          aria-label="Notifications"
        >
          {/* Bell SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ──────────────────────────────────── */}
        {open && (
          <div className="absolute bottom-full left-0 mb-2 w-[320px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50"
            style={{ animation: 'fadeUp 0.15s ease' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-900">Notifications</span>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button onClick={clearAll}
                    className="text-xs text-gray-400 hover:text-gray-700 transition">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="text-2xl mb-2">🔔</div>
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : notifications.map(n => (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${n.read ? 'opacity-60' : ''}`}>
                  <span className="text-base mt-0.5 shrink-0">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700">{n.title}</span>
                      <span className="text-[10px] text-gray-300 shrink-0 mt-0.5">{timeAgo(n.ts)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 bg-gray-900 rounded-full mt-1.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}