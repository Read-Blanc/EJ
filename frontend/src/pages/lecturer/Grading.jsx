import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const FILTERS = ["All", "Pending", "Graded"];

const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

function avatarColor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "??"
  );
}

function statusClass(status) {
  if (status === "Graded") return "bg-green-100 text-green-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export default function Grading() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select(
        `
        id, status, submitted_at,
        assessments ( title ),
        profiles   ( full_name, email )
      `,
      )
      .order("submitted_at", { ascending: false });

    if (error || !data) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setSubmissions(
      data.map((s) => {
        const name = s.profiles?.full_name || s.profiles?.email || "Unknown";
        return {
          id: s.id,
          studentName: name,
          assessmentTitle: s.assessments?.title ?? "—",
          status: s.status ?? "Pending",
          date: s.submitted_at
            ? new Date(s.submitted_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—",
          initials: initials(name),
          color: avatarColor(name),
          raw: s,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const visible = submissions
    .filter((s) => activeFilter === "All" || s.status === activeFilter)
    .filter(
      (s) =>
        !search ||
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.assessmentTitle.toLowerCase().includes(search.toLowerCase()),
    );

  const pendingCount = submissions.filter((s) => s.status === "Pending").length;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">
            Grading Queue
          </div>
          <div className="text-xs text-gray-400">
            {loading
              ? "Loading…"
              : `${pendingCount} pending · ${submissions.length} total`}
          </div>
        </div>
        <input
          type="text"
          placeholder="Search student or assessment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 bg-white">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors mb-[-1px] ${
              activeFilter === f
                ? "border-gray-900 text-gray-900 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {f}
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                activeFilter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {f === "All"
                ? submissions.length
                : submissions.filter((s) => s.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mx-6 my-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Student", "Assessment", "Status", "Submitted", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  Loading submissions…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {activeFilter === "All"
                    ? "No submissions yet."
                    : `No ${activeFilter.toLowerCase()} submissions.`}
                </td>
              </tr>
            ) : (
              visible.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() =>
                    navigate(`/lecturer/grading/${sub.id}`, {
                      state: { submission: sub },
                    })
                  }
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: sub.color }}
                      >
                        {sub.initials}
                      </div>
                      <span className="font-medium text-gray-800">
                        {sub.studentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {sub.assessmentTitle}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(sub.status)}`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {sub.date}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lecturer/grading/${sub.id}`, {
                          state: { submission: sub },
                        });
                      }}
                      className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md hover:bg-gray-700 transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
