import { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { AuthContext } from "../../context/AuthContext";

export default function QuestionBank() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, text, marks, answer_length, sample_answer, assessments(title)",
      )
      .eq("assessments.created_by", user.id)
      .order("id", { ascending: false });

    if (error || !data) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setQuestions(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) showToast("Failed to delete question.");
    else {
      showToast("Question deleted.");
      setConfirmDeleteId(null);
      fetchQuestions();
    }
    setDeleting(false);
  };

  const filtered = questions.filter(
    (q) =>
      !search ||
      q.text?.toLowerCase().includes(search.toLowerCase()) ||
      q.assessments?.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const lengthLabel = { short: "Short", medium: "Medium", long: "Long" };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">
            Question Bank
          </div>
          <div className="text-xs text-gray-400">
            {loading ? "Loading…" : `${questions.length} questions`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            onClick={() => navigate("/lecturer/questions/new")}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
          >
            + New Question
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-6 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Loading questions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            {search
              ? "No questions match your search."
              : "No questions yet. Create one to get started."}
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                    {q.text}
                  </p>
                  {q.assessments?.title && (
                    <div className="text-xs text-gray-400 mt-1">
                      📋 {q.assessments.title}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {q.marks ?? 0} marks
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {lengthLabel[q.answer_length] ?? q.answer_length}
                    </span>
                  </div>
                  {q.sample_answer && (
                    <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Sample Answer
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {q.sample_answer}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/lecturer/questions/${q.id}/edit`)}
                    className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-md hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  {confirmDeleteId === q.id ? (
                    <>
                      <span className="text-xs font-semibold text-red-600">
                        Sure?
                      </span>
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deleting}
                        className="px-3 py-1.5 border border-red-200 text-xs text-red-600 rounded-md hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {deleting ? "…" : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 border border-gray-200 text-xs text-gray-500 rounded-md hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(q.id)}
                      className="px-3 py-1.5 border border-red-100 text-xs text-red-500 rounded-md hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
