import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { AuthContext } from "../../context/AuthContext";

const BLANK_QUESTION = {
  text: "",
  marks: "",
  answerLength: "medium",
  sampleAnswer: "",
};

function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n) =>
    Array.from(
      { length: n },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  return `${part(4)}-${part(4)}`;
}

// ── Question Bank Picker modal ────────────────────────────────────────────────
function QuestionBankPicker({ onAdd, onClose }) {
  const { user } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    supabase
      .from("questions")
      .select(
        "id, text, marks, answer_length, sample_answer, assessments(title, created_by)",
      )
      .order("id", { ascending: false })
      .then(({ data }) => {
        // Only questions from this lecturer's assessments
        setQuestions(
          (data ?? []).filter((q) => q.assessments?.created_by === user.id),
        );
        setLoading(false);
      });
  }, [user.id]);

  const filtered = questions.filter(
    (q) =>
      !search ||
      q.text?.toLowerCase().includes(search.toLowerCase()) ||
      q.assessments?.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAdd = () => {
    const picked = questions
      .filter((q) => selected.has(q.id))
      .map((q) => ({
        text: q.text ?? "",
        marks: String(q.marks ?? ""),
        answerLength: q.answer_length ?? "medium",
        sampleAnswer: q.sample_answer ?? "",
      }));
    onAdd(picked);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <div className="font-bold text-gray-900">Question Bank</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Select questions to import into this assessment
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search questions or assessment name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {search
                  ? "No questions match your search."
                  : "No questions in your bank yet. Create some from the Question Bank page."}
              </div>
            ) : (
              filtered.map((q) => (
                <label
                  key={q.id}
                  className={`flex items-start gap-3 px-6 py-3.5 cursor-pointer transition ${selected.has(q.id) ? "bg-gray-50" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={() => toggle(q.id)}
                    className="mt-0.5 rounded border-gray-300 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                      {q.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {q.marks} marks
                      </span>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full capitalize">
                        {q.answer_length}
                      </span>
                      {q.assessments?.title && (
                        <span className="text-[10px] text-gray-400">
                          from: {q.assessments.title}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {selected.size > 0
                ? `${selected.size} question${selected.size !== 1 ? "s" : ""} selected`
                : "None selected"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={selected.size === 0}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-40"
              >
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreateEditAssessment() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // When duplicating, LecturerAssessments navigates here with state.prefill
  const prefill = location.state?.prefill ?? null;

  const [form, setForm] = useState(
    prefill ?? {
      title: "",
      topic: "",
      duration: "",
      questions: [{ ...BLANK_QUESTION }],
    },
  );
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const { data: a } = await supabase
        .from("assessments")
        .select("title, topic, duration_minutes")
        .eq("id", id)
        .single();

      const { data: qs } = await supabase
        .from("questions")
        .select("text, marks, answer_length, sample_answer")
        .eq("assessment_id", id)
        .order("order_index");

      setForm({
        title: a?.title ?? "",
        topic: a?.topic ?? "",
        duration: a?.duration_minutes ? String(a.duration_minutes) : "",
        questions: qs?.length
          ? qs.map((q) => ({
              text: q.text,
              marks: String(q.marks),
              answerLength: q.answer_length,
              sampleAnswer: q.sample_answer || "",
            }))
          : [{ ...BLANK_QUESTION }],
      });
      setLoading(false);
    })();
  }, [id, isEditing]);

  const setTopField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setQField = (idx, field) => (e) =>
    setForm((prev) => {
      const qs = [...prev.questions];
      qs[idx] = { ...qs[idx], [field]: e.target.value };
      return { ...prev, questions: qs };
    });
  const addQuestion = () =>
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...BLANK_QUESTION }],
    }));
  const removeQuestion = (idx) =>
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  const moveQuestion = (idx, dir) =>
    setForm((prev) => {
      const qs = [...prev.questions];
      const swap = idx + dir;
      if (swap < 0 || swap >= qs.length) return prev;
      [qs[idx], qs[swap]] = [qs[swap], qs[idx]];
      return { ...prev, questions: qs };
    });

  // Append bank questions to the current list
  const handleBankImport = (imported) => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, ...imported],
    }));
  };

  const save = async (status) => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (status === "Active" && form.questions.some((q) => !q.text.trim())) {
      setError("All questions must have text before publishing.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const duration = form.duration ? parseInt(form.duration, 10) : null;
      let assessmentId;

      if (isEditing) {
        const updateData = {
          title: form.title.trim(),
          topic: form.topic.trim(),
          status,
          duration_minutes: duration,
        };
        if (status === "Active") updateData.access_code = generateAccessCode();
        const { error: aErr } = await supabase
          .from("assessments")
          .update(updateData)
          .eq("id", id);
        if (aErr) throw aErr;
        await supabase.from("questions").delete().eq("assessment_id", id);
        assessmentId = id;
      } else {
        const insertData = {
          title: form.title.trim(),
          topic: form.topic.trim(),
          status,
          created_by: user.id,
          duration_minutes: duration,
        };
        if (status === "Active") insertData.access_code = generateAccessCode();
        const { data: assessment, error: aErr } = await supabase
          .from("assessments")
          .insert(insertData)
          .select()
          .single();
        if (aErr) throw aErr;
        assessmentId = assessment.id;
      }

      const { error: qErr } = await supabase.from("questions").insert(
        form.questions.map((q, i) => ({
          assessment_id: assessmentId,
          order_index: i,
          text: q.text.trim(),
          marks: parseInt(q.marks, 10) || 0,
          answer_length: q.answerLength,
          sample_answer: q.sampleAnswer.trim(),
        })),
      );
      if (qErr) throw qErr;
      navigate("/lecturer/assessments");
    } catch (e) {
      setError(e.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = form.questions.reduce(
    (s, q) => s + (parseInt(q.marks, 10) || 0),
    0,
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-full p-10 text-sm text-gray-400">
        Loading…
      </div>
    );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button
            onClick={() => navigate("/lecturer/assessments")}
            className="hover:text-gray-700 transition"
          >
            Assessments
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {isEditing
              ? "Edit Assessment"
              : prefill
                ? `Copy of "${prefill.title}"`
                : "Create Assessment"}
          </span>
        </nav>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/lecturer/assessments")}
            disabled={saving}
            className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => save("Draft")}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => save("Active")}
            disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-40"
          >
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-5">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        {/* Duplication notice */}
        {prefill && !isEditing && (
          <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
            📋 Duplicated from{" "}
            <span className="font-semibold text-gray-700">{prefill.title}</span>{" "}
            — edit and save as a new draft.
          </div>
        )}

        {/* Assessment details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">
            Assessment Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={setTopField("title")}
              placeholder="e.g. CS-401 Midterm"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Topic Tag
            </label>
            <input
              type="text"
              value={form.topic}
              onChange={setTopField("topic")}
              placeholder="e.g. Data Structures"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Time Limit{" "}
              <span className="font-normal text-gray-400 normal-case">
                (minutes, optional)
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={form.duration}
              onChange={setTopField("duration")}
              placeholder="Leave blank for no time limit"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
            {form.duration && (
              <p className="text-xs text-gray-400 mt-1">
                ⏱ Students will have {form.duration} minute
                {form.duration !== "1" ? "s" : ""} to complete this assessment.
              </p>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Questions</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.questions.length} question
                {form.questions.length !== 1 ? "s" : ""} · {totalMarks} marks
                total
              </p>
            </div>
            {/* Import from Question Bank */}
            <button
              onClick={() => setShowBankPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-md hover:bg-gray-50 transition"
            >
              📚 Import from Bank
            </button>
          </div>

          <div className="space-y-4">
            {form.questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">
                    Question {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveQuestion(idx, -1)}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded text-xs text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveQuestion(idx, 1)}
                      disabled={idx === form.questions.length - 1}
                      className="w-6 h-6 rounded text-xs text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition"
                      title="Move down"
                    >
                      ↓
                    </button>
                    {form.questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="w-7 h-7 rounded-md border border-red-100 text-xs text-red-400 hover:bg-red-50 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={q.text}
                  onChange={setQField(idx, "text")}
                  placeholder="Enter question text…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition resize-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={q.marks}
                      onChange={setQField(idx, "marks")}
                      placeholder="10"
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Expected Length
                    </label>
                    <select
                      value={q.answerLength}
                      onChange={setQField(idx, "answerLength")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                    >
                      <option value="short">Short (1–2 sentences)</option>
                      <option value="medium">Medium (1–2 paragraphs)</option>
                      <option value="long">Long (3+ paragraphs)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Sample Answer{" "}
                    <span className="text-gray-300">(used for AI grading)</span>
                  </label>
                  <textarea
                    value={q.sampleAnswer}
                    onChange={setQField(idx, "sampleAnswer")}
                    placeholder="Enter the ideal answer the AI will compare against…"
                    rows={4}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="w-full py-3 border-2 border-dashed border-gray-200 text-sm text-gray-500 rounded-xl hover:border-gray-400 hover:text-gray-700 transition font-medium"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Question Bank picker */}
      {showBankPicker && (
        <QuestionBankPicker
          onAdd={handleBankImport}
          onClose={() => setShowBankPicker(false)}
        />
      )}
    </div>
  );
}
