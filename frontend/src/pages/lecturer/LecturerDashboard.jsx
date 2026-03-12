import { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const today = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(n = "") {
  return (
    n
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "??"
  );
}

function Sparkline({ values }) {
  if (!values?.length || values.every((v) => v === 0)) return null;
  const max = Math.max(...values, 1);
  const W = 72,
    H = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={pts}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Inline Notifications Panel ───────────────────────────────────────────────
function NotificationsPanel({
  notifications,
  unreadCount,
  markRead,
  markAllRead,
  clearAll,
}) {
  const navigate = useNavigate();

  const timeAgoShort = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const handleClick = (n) => {
    markRead(n.id);
    if (n.href) navigate(n.href);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-900 text-sm">
            Notifications
          </div>
          {unreadCount > 0 && (
            <span className="w-5 h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-700 transition"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-2xl mb-2">🔔</div>
            <p className="text-xs text-gray-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition ${n.read ? "opacity-60" : ""}`}
            >
              <span className="text-base leading-none mt-0.5 shrink-0">
                {n.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {n.title}
                </div>
                <div className="text-sm text-gray-800 mt-0.5 leading-snug truncate">
                  {n.body}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-gray-400">
                  {timeAgoShort(n.ts)}
                </span>
                {!n.read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {notifications.length > 0 && unreadCount > 0 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={markAllRead}
            className="text-xs text-gray-400 hover:text-gray-700 transition"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}

export default function LecturerDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [activity, setActivity] = useState([]);
  const [dist, setDist] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotifications(user);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [{ data: asms }, { data: allSubs }] = await Promise.all([
      supabase
        .from("assessments")
        .select("id, title, status")
        .eq("created_by", user.id),
      supabase
        .from("submissions")
        .select(
          "id, status, submitted_at, assessment_id, assessments!inner(created_by, title), profiles(full_name, email), answers(marks_awarded, questions(marks))",
        )
        .eq("assessments.created_by", user.id)
        .order("submitted_at", { ascending: false }),
    ]);

    const asmList = asms ?? [];
    const subList = allSubs ?? [];

    const pendingSubs = subList.filter((s) => s.status === "Pending");
    const gradedSubs = subList.filter((s) => s.status === "Graded");

    const scores = gradedSubs
      .map((s) => {
        const maxM =
          s.answers?.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0) ??
          0;
        const award =
          s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
        return maxM > 0 ? Math.round((award / maxM) * 100) : null;
      })
      .filter((v) => v !== null);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : null;

    const buckets = [
      { label: "< 50%", count: scores.filter((s) => s < 50).length },
      { label: "50–69", count: scores.filter((s) => s >= 50 && s < 70).length },
      { label: "70–89", count: scores.filter((s) => s >= 70 && s < 90).length },
      { label: "90+", count: scores.filter((s) => s >= 90).length },
    ];
    const maxBucket = Math.max(...buckets.map((b) => b.count), 1);
    setDist(
      buckets.map((b) => ({
        ...b,
        pct: Math.round((b.count / maxBucket) * 100),
      })),
    );

    const now = Date.now();
    const trendArr = Array(7).fill(0);
    subList.forEach((s) => {
      if (!s.submitted_at) return;
      const diff = Math.floor(
        (now - new Date(s.submitted_at).getTime()) / 86400000,
      );
      if (diff >= 0 && diff < 7) trendArr[6 - diff]++;
    });
    setTrend(trendArr);

    setPending(
      pendingSubs.slice(0, 5).map((s) => {
        const name = s.profiles?.full_name || s.profiles?.email || "Unknown";
        return {
          id: s.id,
          student: name,
          assessment: s.assessments?.title ?? "—",
          initials: initials(name),
        };
      }),
    );

    setActivity(
      subList.slice(0, 8).map((s) => {
        const name = s.profiles?.full_name || s.profiles?.email || "Student";
        const verb = s.status === "Graded" ? "graded" : "submitted";
        return {
          text: `${name} ${verb} ${s.assessments?.title ?? "an assessment"}`,
          bold: name,
          time: s.submitted_at ? timeAgo(s.submitted_at) : "—",
        };
      }),
    );

    setStats({
      totalAsm: asmList.length,
      activeAsm: asmList.filter((a) => a.status === "Active").length,
      pendingCount: pendingSubs.length,
      avgScore,
    });
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const ch = supabase
      .channel("dashboard-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        fetchAll,
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const Skeleton = ({ className }) => (
    <div className={`bg-gray-100 rounded animate-pulse ${className}`} />
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <span>Home</span>
          <span>/</span>
          <span className="text-gray-700 font-medium">Dashboard</span>
        </nav>
        <button
          onClick={() => navigate("/lecturer/grading")}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
        >
          {loading
            ? "Grading Queue"
            : `Start Grading${stats?.pendingCount ? ` (${stats.pendingCount})` : ""}`}
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Welcome */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-bold text-gray-900">
              Good {greeting()}, {firstName}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">
              Here's what's happening across your assessments today.
            </div>
            <div className="text-xs text-gray-300 mt-1">{today}</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Assessments",
              value: stats?.totalAsm,
              sub: `${stats?.activeAsm ?? 0} active`,
            },
            {
              label: "Pending Review",
              value: stats?.pendingCount,
              sub: "awaiting grading",
            },
            {
              label: "Avg. Class Score",
              value: stats?.avgScore != null ? `${stats.avgScore}%` : "—",
              sub: "across graded",
            },
            {
              label: "Submission Trend",
              value: trend.reduce((a, b) => a + b, 0),
              sub: "last 7 days",
              extra: <Sparkline values={trend} />,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {s.label}
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-gray-900 mb-0.5">
                  {s.value ?? "0"}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">{s.sub}</div>
                {s.extra && !loading && s.extra}
              </div>
            </div>
          ))}
        </div>

        {/* Middle row: Grading Queue + Activity + Notifications */}
        <div className="grid grid-cols-3 gap-4">
          {/* Grading Queue */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Grading Queue
                </div>
                <div className="text-xs text-gray-400">
                  Scripts awaiting review
                </div>
              </div>
              <button
                onClick={() => navigate("/lecturer/grading")}
                className="text-xs text-gray-500 hover:text-gray-900 transition"
              >
                View all →
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-50">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                All caught up — no pending submissions.
              </div>
            ) : (
              <>
                {pending.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      navigate(`/lecturer/grading/${item.id}`, {
                        state: {
                          submission: {
                            id: item.id,
                            status: "Pending",
                            assessmentTitle: item.assessment,
                            studentName: item.student,
                          },
                        },
                      })
                    }
                    className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {item.student}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {item.assessment}
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                      Pending
                    </span>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <button
                    onClick={() => navigate("/lecturer/grading")}
                    className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
                  >
                    Start Grading ({stats?.pendingCount ?? 0} pending)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900 text-sm">
                Recent Activity
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                  </div>
                ))
              ) : activity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No activity yet.
                </div>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 leading-snug">
                        <span className="font-semibold text-gray-800">
                          {a.bold}
                        </span>
                        {a.text.replace(a.bold, "")}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {a.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notifications — inline, no bell/dropdown needed */}
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            markRead={markRead}
            markAllRead={markAllRead}
            clearAll={clearAll}
          />
        </div>

        {/* Bottom row: Score Distribution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-bold text-gray-900 mb-1">
              Score Distribution
            </div>
            <div className="text-xs text-gray-400 mb-4">
              Graded submissions by band
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : dist.every((d) => d.count === 0) ? (
              <div className="text-xs text-gray-400">
                No graded submissions yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dist.map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 shrink-0">
                      {d.label}
                    </span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-5 text-right shrink-0">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-bold text-gray-900 mb-1">
              Submissions — Last 7 Days
            </div>
            <div className="text-xs text-gray-400 mb-4">
              Daily submission count
            </div>
            {loading ? (
              <div className="flex items-end gap-2 h-20">
                {[...Array(7)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="flex-1"
                    style={{ height: `${30 + i * 8}px` }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-2 h-20">
                {trend.map((v, i) => {
                  const max = Math.max(...trend, 1);
                  const h = Math.max((v / max) * 80, v > 0 ? 8 : 2);
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-gray-900 rounded-sm transition-all duration-500"
                        style={{ height: `${h}px` }}
                      />
                      <span className="text-[9px] text-gray-400">
                        {
                          ["M", "T", "W", "T", "F", "S", "S"][
                            new Date(Date.now() - (6 - i) * 86400000).getDay()
                          ]
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast strip for new notifications */}
      <NotificationToast notifications={notifications} />
    </div>
  );
}

// Lightweight toast — fires when a brand-new unread notification arrives
function NotificationToast({ notifications }) {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!notifications.length) return;
    const newest = notifications[0];
    if (!newest.read && newest.ts > Date.now() - 500) {
      setQueue((q) => [...q, newest.id]);
      setTimeout(() => setQueue((q) => q.filter((x) => x !== newest.id)), 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications[0]?.id]);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100] pointer-events-none">
      {queue.map((tid) => {
        const n = notifications.find((x) => x.id === tid);
        if (!n) return null;
        return (
          <div
            key={tid}
            className="pointer-events-auto flex items-start gap-3 bg-gray-950 text-white text-sm px-4 py-3 rounded-xl shadow-2xl max-w-[320px]"
            style={{ animation: "slideIn 0.25s ease" }}
          >
            <span className="text-base leading-none mt-0.5">{n.icon}</span>
            <div>
              <div className="font-semibold text-xs text-gray-400 uppercase tracking-wide">
                {n.title}
              </div>
              <div className="mt-0.5 leading-snug">{n.body}</div>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
