import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";

function wordCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function CircularProgress({ value, max }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);
  const color = pct >= 0.75 ? "#10b981" : pct >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="104" height="104" viewBox="0 0 104 104">
      <circle
        cx="52"
        cy="52"
        r={r}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth="8"
      />
      <circle
        cx="52"
        cy="52"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 52 52)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

export default function GradingDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Accept submission from router state (from Grading list) or fetch by id
  const [submission, setSubmission] = useState(
    location.state?.submission ?? null,
  );
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(submission?.status ?? "");
  const [overrideMode, setOverrideMode] = useState(false);
  const [gradingMode, setGradingMode] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [aiScoring, setAiScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [assessmentId, setAssessmentId] = useState(null);

  // If no submission from state, fetch it
  useEffect(() => {
    if (!submission && id) {
      supabase
        .from("submissions")
        .select(
          "id, status, submitted_at, assessments(title), profiles(full_name, email)",
        )
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) {
            const name =
              data.profiles?.full_name || data.profiles?.email || "Unknown";
            setSubmission({
              id: data.id,
              status: data.status,
              assessmentTitle: data.assessments?.title,
              studentName: name,
              date: data.submitted_at,
            });
            setStatus(data.status ?? "");
          }
        });
    }
  }, [id, submission]);

  const fetchAnswers = useCallback(async () => {
    if (!submission?.id && !id) return;
    setLoading(true);
    const subId = submission?.id ?? id;

    const { data, error } = await supabase
      .from("answers")
      .select(
        "id, answer_text, marks_awarded, ai_score, questions(id, text, marks, sample_answer, order_index)",
      )
      .eq("submission_id", subId);
    const { data: sub } = await supabase
      .from("submissions")
      .select("assessment_id")
      .eq("id", subId)
      .single();
    setAssessmentId(sub?.assessment_id ?? null);

    if (error || !data) {
      setAnswers([]);
      setLoading(false);
      return;
    }

    const sorted = [...data].sort(
      (a, b) =>
        (a.questions?.order_index ?? 0) - (b.questions?.order_index ?? 0),
    );
    setAnswers(sorted);

    const init = {};
    sorted.forEach((a) => {
      init[a.id] = a.marks_awarded !== null ? String(a.marks_awarded) : "";
    });
    setOverrides(init);
    setLoading(false);
  }, [submission, id]);

  useEffect(() => {
    fetchAnswers();
    setOverrideMode(false);
    setGradingMode(null);
  }, [fetchAnswers]);

  const handleRunAI = async () => {
    setAiScoring(true);
    try {
      const { error } = await supabase.functions.invoke("grade-submission", {
        body: { submission_id: submission?.id ?? id },
      });
      if (error) throw error;
      await fetchAnswers();
      showToast("AI grading complete.");
    } catch {
      showToast("AI grading failed. Please try again.");
    } finally {
      setAiScoring(false);
    }
  };

  const handleChooseMode = (mode) => {
    setGradingMode(mode);
    setOverrideMode(true);
    if (mode === "auto") {
      const init = {};
      answers.forEach((a) => {
        const suggested =
          a.ai_score !== null
            ? Math.round(a.ai_score * (a.questions?.marks ?? 0))
            : a.marks_awarded !== null
              ? a.marks_awarded
              : 0;
        init[a.id] = String(suggested);
      });
      setOverrides(init);
    }
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    try {
      for (const answer of answers) {
        const val = parseInt(overrides[answer.id], 10);
        if (!isNaN(val)) {
          const { error } = await supabase
            .from("answers")
            .update({ marks_awarded: val })
            .eq("id", answer.id);
          if (error) throw error;
        }
      }
      const { error: sErr } = await supabase
        .from("submissions")
        .update({ status: "Graded" })
        .eq("id", submission?.id ?? id);
      if (sErr) throw sErr;
      setStatus("Graded");
      setOverrideMode(false);
      setGradingMode(null);
      showToast("Grades saved successfully.");
      await fetchAnswers();
    } catch {
      showToast("Failed to save grades. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const totalMarks = answers.reduce(
    (sum, a) => sum + (a.questions?.marks ?? 0),
    0,
  );
  const awardedMarks = answers.reduce(
    (sum, a) => sum + (a.marks_awarded ?? 0),
    0,
  );
  const pct =
    status === "Graded" && totalMarks > 0
      ? Math.round((awardedMarks / totalMarks) * 100)
      : null;
  const hasAiScores = answers.some((a) => a.ai_score !== null);

  if (!submission && !id) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm p-10">
        No submission selected.{" "}
        <button
          onClick={() => navigate("/lecturer/grading")}
          className="ml-2 text-gray-700 underline hover:text-gray-900"
        >
          Return to queue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button
            onClick={() => navigate("/lecturer/grading")}
            className="hover:text-gray-700 transition"
          >
            Grading Queue
          </button>
          <span>/</span>
          <span className="text-gray-600">{submission?.assessmentTitle}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {submission?.studentName}
          </span>
        </nav>
        {!overrideMode && status === "Graded" && (
          <button
            onClick={() => {
              setGradingMode("manual");
              setOverrideMode(true);
            }}
            className="px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition"
          >
            Edit Grades
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Title row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {submission?.assessmentTitle}
            </h1>
            <div className="text-sm text-gray-400 mt-1">
              {submission?.studentName} · Submitted {submission?.date}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
              status === "Graded"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {status === "Graded" ? "Graded" : "Pending Review"}
          </span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Questions",
              value: loading ? "—" : answers.length,
              sub: "in this submission",
            },
            {
              label: "Total Marks",
              value: loading ? "—" : totalMarks,
              sub: "available",
            },
            {
              label: "Marks Awarded",
              value: status === "Graded" ? awardedMarks : "—",
              sub: pct !== null ? `${pct}% score` : "not yet graded",
              colored: pct !== null,
              color:
                pct >= 75
                  ? "text-emerald-500"
                  : pct >= 50
                    ? "text-amber-500"
                    : "text-red-500",
            },
            {
              label: "Status",
              value: status === "Graded" ? "Graded" : "Pending",
              sub: "submission status",
              colored: true,
              color: status === "Graded" ? "text-emerald-500" : "text-gray-900",
            },
          ].map(({ label, value, sub, colored, color }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {label}
              </div>
              <div
                className={`text-[28px] font-bold leading-none mb-1 ${colored && color ? color : "text-gray-900"}`}
              >
                {value}
              </div>
              <div className="text-xs text-gray-400">{sub}</div>
            </div>
          ))}
        </div>

        {/* Main layout */}
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Loading answers…
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
            {/* Left: answers */}
            <div className="space-y-4">
              {answers.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                  No answers found.
                </div>
              ) : (
                answers.map((a, idx) => (
                  <div key={a.id} className="space-y-3">
                    {/* Question */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          Question {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          Max: {a.questions?.marks ?? 0} marks
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {a.questions?.text ?? "—"}
                      </p>
                      {a.questions?.sample_answer && (
                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                            Reference Answer
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {a.questions.sample_answer}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Student answer */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          Student Answer
                        </span>
                        <div className="flex items-center gap-3">
                          {a.ai_score !== null && (
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                              AI similarity: {Math.round(a.ai_score * 100)}%
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {wordCount(a.answer_text)} words
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 border-l-4 border-gray-300 rounded-r-lg p-4">
                        {a.answer_text ? (
                          a.answer_text.split("\n\n").map((para, i) => (
                            <p
                              key={i}
                              className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0"
                            >
                              {para}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            No answer submitted.
                          </p>
                        )}
                      </div>
                      {a.marks_awarded !== null && !overrideMode && (
                        <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Awarded: {a.marks_awarded} / {a.questions?.marks ?? 0}{" "}
                          marks
                        </span>
                      )}
                      {/* Manual override input */}
                      {overrideMode && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Marks:</span>
                          <input
                            type="number"
                            min={0}
                            max={a.questions?.marks ?? 0}
                            value={overrides[a.id] ?? ""}
                            onChange={(e) =>
                              setOverrides((prev) => ({
                                ...prev,
                                [a.id]: e.target.value,
                              }))
                            }
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                          />
                          <span className="text-xs text-gray-400">
                            / {a.questions?.marks ?? 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right: grade sidebar */}
            <aside className="space-y-3 sticky top-[56px]">
              {/* Overall grade */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-sm font-semibold text-gray-900 mb-4">
                  Overall Grade
                </div>
                <div className="flex justify-center mb-3 relative">
                  <CircularProgress
                    value={status === "Graded" ? awardedMarks : 0}
                    max={totalMarks}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[28px] font-bold text-gray-900 leading-none">
                        {status === "Graded" ? awardedMarks : "—"}
                      </span>
                      <span className="text-xs text-gray-400">
                        /{totalMarks}
                      </span>
                    </div>
                  </div>
                </div>
                {pct !== null && (
                  <div
                    className={`text-center text-sm font-semibold ${pct >= 75 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}
                  >
                    {pct}%
                  </div>
                )}
              </div>

              {/* AI grading panel */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  AI Grading
                </div>
                {assessmentId && answers.length > 0 && (
                  <PlagiarismPanel
                    assessmentId={assessmentId}
                    currentSubId={submission?.id ?? id}
                    answers={answers}
                  />
                )}
                {!overrideMode ? (
                  <>
                    <button
                      onClick={handleRunAI}
                      disabled={aiScoring}
                      className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                    >
                      {aiScoring
                        ? "Running AI…"
                        : hasAiScores
                          ? "Re-run AI Grading"
                          : "Run AI Grading"}
                    </button>
                    {hasAiScores && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleChooseMode("auto")}
                          className="flex-1 py-2 border border-gray-200 text-xs font-semibold text-gray-700 rounded-md hover:bg-gray-50 transition"
                        >
                          Apply AI Scores
                        </button>
                        <button
                          onClick={() => handleChooseMode("manual")}
                          className="flex-1 py-2 border border-gray-200 text-xs font-semibold text-gray-700 rounded-md hover:bg-gray-50 transition"
                        >
                          Grade Manually
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleSaveGrades}
                      disabled={saving}
                      className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Grades"}
                    </button>
                    <button
                      onClick={() => {
                        setOverrideMode(false);
                        setGradingMode(null);
                        fetchAnswers();
                      }}
                      className="w-full py-2 text-xs text-gray-400 hover:text-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
