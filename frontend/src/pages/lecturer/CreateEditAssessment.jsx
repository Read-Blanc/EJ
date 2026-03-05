import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const BLANK_QUESTION = { text: '', marks: '', answerLength: 'medium', sampleAnswer: '' };

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part  = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(4)}-${part(4)}`;
}

export default function CreateEditAssessment() {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const { id }     = useParams();           // present when editing
  const isEditing  = Boolean(id);

  const [form,    setForm]    = useState({ title: '', topic: '', questions: [{ ...BLANK_QUESTION }] });
  const [loading, setLoading] = useState(isEditing);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // Load existing data when editing
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const { data: a } = await supabase.from('assessments').select('title, topic').eq('id', id).single();
      const { data: qs } = await supabase.from('questions').select('text, marks, answer_length, sample_answer').eq('assessment_id', id).order('order_index');

      setForm({
        title: a?.title ?? '',
        topic: a?.topic ?? '',
        questions: qs?.length
          ? qs.map(q => ({ text: q.text, marks: String(q.marks), answerLength: q.answer_length, sampleAnswer: q.sample_answer || '' }))
          : [{ ...BLANK_QUESTION }],
      });
      setLoading(false);
    })();
  }, [id, isEditing]);

  const setTopField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setQField   = (idx, field) => (e) => setForm(prev => {
    const qs = [...prev.questions]; qs[idx] = { ...qs[idx], [field]: e.target.value }; return { ...prev, questions: qs };
  });
  const addQuestion    = () => setForm(prev => ({ ...prev, questions: [...prev.questions, { ...BLANK_QUESTION }] }));
  const removeQuestion = (idx) => setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));

  const save = async (status) => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (status === 'Active' && form.questions.some(q => !q.text.trim())) {
      setError('All questions must have text before publishing.'); return;
    }
    setError(''); setSaving(true);

    try {
      let assessmentId;
      if (isEditing) {
        const upd = { title: form.title, topic: form.topic, status };
        if (status === 'Active') upd.access_code = generateAccessCode();
        const { error: aErr } = await supabase.from('assessments').update(upd).eq('id', id);
        if (aErr) throw aErr;
        await supabase.from('questions').delete().eq('assessment_id', id);
        assessmentId = id;
      } else {
        const ins = { title: form.title, topic: form.topic, status, created_by: user.id };
        if (status === 'Active') ins.access_code = generateAccessCode();
        const { data: a, error: aErr } = await supabase.from('assessments').insert(ins).select().single();
        if (aErr) throw aErr;
        assessmentId = a.id;
      }

      const { error: qErr } = await supabase.from('questions').insert(
        form.questions.map((q, i) => ({
          assessment_id: assessmentId, order_index: i,
          text: q.text, marks: parseInt(q.marks, 10) || 0,
          answer_length: q.answerLength, sample_answer: q.sampleAnswer,
        }))
      );
      if (qErr) throw qErr;
      navigate('/lecturer/assessments');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 p-10">Loading…</div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => navigate('/lecturer/assessments')} className="hover:text-gray-700 transition">Assessments</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{isEditing ? 'Edit Assessment' : 'Create Assessment'}</span>
        </nav>
        <div className="flex gap-2">
          <button onClick={() => navigate('/lecturer/assessments')} disabled={saving}
            className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition disabled:opacity-40">
            Cancel
          </button>
          <button onClick={() => save('Draft')} disabled={saving}
            className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-40">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => save('Active')} disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-40">
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 max-w-2xl space-y-5">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>
        )}

        {/* Assessment details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Assessment Details</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
            <input type="text" value={form.title} onChange={setTopField('title')} placeholder="e.g. CS-401 Midterm"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Topic Tag</label>
            <input type="text" value={form.topic} onChange={setTopField('topic')} placeholder="e.g. Data Structures"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Questions ({form.questions.length})</h2>
          <div className="space-y-4">
            {form.questions.map((q, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Question {idx + 1}</span>
                  {form.questions.length > 1 && (
                    <button onClick={() => removeQuestion(idx)} className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
                  )}
                </div>
                <textarea value={q.text} onChange={setQField(idx, 'text')} placeholder="Enter question text…" rows={3}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Marks</label>
                    <input type="number" min="1" max="100" value={q.marks} onChange={setQField(idx, 'marks')} placeholder="10"
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Expected Length</label>
                    <select value={q.answerLength} onChange={setQField(idx, 'answerLength')}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                      <option value="short">Short (1–2 sentences)</option>
                      <option value="medium">Medium (1–2 paragraphs)</option>
                      <option value="long">Long (essay)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sample Answer <span className="text-gray-300">(used by AI grader)</span></label>
                  <textarea value={q.sampleAnswer} onChange={setQField(idx, 'sampleAnswer')} placeholder="Enter model answer…" rows={4}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addQuestion}
            className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 rounded-xl transition">
            + Add Question
          </button>
        </div>
      </div>
    </div>
  );
}