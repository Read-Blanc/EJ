import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * useNotifications
 *
 * Subscribes to Supabase realtime changes and builds an in-app notification list.
 *
 * Lecturer events
 *   • New submission arrives  →  "Student X submitted 'Assessment Title'"
 *
 * Student events (keyed by student_id)
 *   • Submission status → 'Graded'  →  "Your submission for 'Assessment Title' has been graded"
 *
 * Returns { notifications, unreadCount, markAllRead, markRead, clearAll }
 */
export function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);
  const channelRef = useRef(null);

  const add = useCallback((notif) => {
    setNotifications(prev => [
      { id: crypto.randomUUID(), ts: Date.now(), read: false, ...notif },
      ...prev,
    ].slice(0, 50)); // cap at 50
  }, []);

  useEffect(() => {
    if (!user?.id || !user?.role) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`notifications-${user.id}`);

    if (user.role === 'lecturer') {
      // New submissions on assessments this lecturer created
      channel.on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'submissions',
        },
        async (payload) => {
          const subId = payload.new?.id;
          if (!subId) return;

          // Fetch student name + assessment title (only for this lecturer's assessments)
          const { data } = await supabase
            .from('submissions')
            .select('profiles(full_name, email), assessments(title, created_by)')
            .eq('id', subId)
            .single();

          if (!data || data.assessments?.created_by !== user.id) return;

          const studentName = data.profiles?.full_name || data.profiles?.email || 'A student';
          const title       = data.assessments?.title ?? 'an assessment';

          add({
            type:    'new_submission',
            icon:    '📝',
            title:   'New submission',
            body:    `${studentName} submitted "${title}"`,
            href:    '/lecturer/grading',
          });
        }
      );
    }

    if (user.role === 'student') {
      // Own submissions being graded
      channel.on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'submissions',
          filter: `student_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new?.status !== 'Graded') return;
          const subId = payload.new?.id;

          const { data } = await supabase
            .from('submissions')
            .select('assessments(title)')
            .eq('id', subId)
            .single();

          const title = data?.assessments?.title ?? 'your submission';

          add({
            type:    'graded',
            icon:    '✅',
            title:   'Submission graded',
            body:    `"${title}" has been graded`,
            href:    `/student/results/${subId}`,
          });
        }
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, user?.role, add]);

  const markRead    = useCallback((id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
  const clearAll    = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, clearAll };
}