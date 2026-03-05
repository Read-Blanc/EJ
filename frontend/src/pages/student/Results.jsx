import { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { AuthContext } from "../../context/AuthContext";

function statusClass(status) {
  if (status === "Graded") return "bg-green-100 text-green-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-500";
}

export default function Results() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select(
        `id, submitted_at, status, assessments(title, topic, questions(id, marks))`,
      )
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false });

    if (error || !data) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setSubmissions(
      data.map((s) => {
        const a = s.assessments;
        const maxMarks =
          a?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0;
        return {
          id: s.id,
          title: a?.title ?? "—",
          topic: a?.topic ?? "",
          maxMarks,
          status: s.status,
          submittedAt: s.submitted_at,
        };
      }),
    );
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">My Results</div>
          <div className="text-xs text-gray-400">
            {loading
              ? "Loading…"
              : `${submissions.length} submission${submissions.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-6 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Loading your results…
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            No submissions yet. Complete an assessment to see your results here.
          </div>
        ) : (
          submissions.map((s) => (
            <div
              key={s.id}
              onClick={() =>
                navigate(`/student/results/${s.id}`, {
                  state: { submission: s },
                })
              }
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-gray-300 hover:shadow-sm transition"
            >
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {s.title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {s.topic || "No topic"} · {s.maxMarks} marks total
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  Submitted: {formatDate(s.submittedAt)}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(s.status)}`}
              >
                {s.status ?? "Pending"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
