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
  const { id }     = useParams();
  const isEditing  = Boolean(id);

  const [form,    setForm]    = useState({
    title: '', topic: '', duration: '', questions: [{ ...BLANK_QUESTION }]
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const { data: a } = await supabase
        .from('assessments')
        .select('title, topic, duration_minutes')
        .eq('id', id)
        .single();

      const { data: qs } = await supabase
        .from('questions')
        .select('text, marks, answer_length, sample_answer')
        .eq('assessment_id', id)
        .order('order_index');

      setForm({
        title: a?.title ?? '',
        topic: a?.topic ?? '',
        duration: a?.duration_minutes ? String(a.duration_minutes) : '',
        questions: qs?.length
          ? qs.map(q => ({ text: q.text, marks: String(q.marks), answerLength: q.answer_length, sampleAnswer: q.sample_answer || '' }))
          : [{ ...BLANK_QUESTION }],
      });
      setLoading(false);
    })();
  }, [id, isEditing]);

  const setTopField   = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setQField     = (idx, field) => (e) => setForm(prev => {
    const qs = [...prev.questions]; qs[idx] = { ...qs[idx], [field]: e.target.value }; return { ...prev, questions: qs };
  });
  const addQuestion    = () => setForm(prev => ({ ...prev, questions: [...prev.questions, { ...BLANK_QUESTION }] }));
  const removeQuestion = (idx) => setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  const moveQuestion   = (idx, dir) => setForm(prev => {
    const qs = [...prev.questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= qs.length) return prev;
    [qs[idx], qs[swap]] = [qs[swap], qs[idx]];
    return { ...prev, questions: qs };
  });

  const save = async (status) => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (status === 'Active' && form.questions.some(q => !q.text.trim())) {
      setError('All questions must have text before publishing.'); return;
    }
    setError(''); setSaving(true);

    try {
      const duration = form.duration ? parseInt(form.duration, 10) : null;
      let assessmentId;

      if (isEditing) {
        const updateData = { title: form.title.trim(), topic: form.topic.trim(), status, duration_minutes: duration };
        if (status === 'Active') updateData.access_code = generateAccessCode();
        const { error: aErr } = await supabase.from('assessments').update(updateData).eq('id', id);
        if (aErr) throw aErr;
        await supabase.from('questions').delete().eq('assessment_id', id);
        assessmentId = id;
      } else {
        const insertData = { title: form.title.trim(), topic: form.topic.trim(), status, created_by: user.id, duration_minutes: duration };
        if (status === 'Active') insertData.access_code = generateAccessCode();
        const { data: assessment, error: aErr } = await supabase.from('assessments').insert(insertData).select().single();
        if (aErr) throw aErr;
        assessmentId = assessment.id;
      }

      const { error: qErr } = await supabase.from('questions').insert(
        form.questions.map((q, i) => ({
          assessment_id: assessmentId,
          order_index:   i,
          text:          q.text.trim(),
          marks:         parseInt(q.marks, 10) || 0,
          answer_length: q.answerLength,
          sample_answer: q.sampleAnswer.trim(),
        }))
      );
      if (qErr) throw qErr;

      navigate('/lecturer/assessments');
    } catch (e) {
      setError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = form.questions.reduce((s, q) => s + (parseInt(q.marks, 10) || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full p-10 text-sm text-gray-400">Loading…</div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => navigate('/lecturer/assessments')} className="hover:text-gray-700 transition">
            Assessments
          </button>
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

      <div className="p-6 max-w-2xl space-y-5">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>
        )}

        {/* Assessment Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Assessment Details</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
            <input type="text" value={form.title} onChange={setTopField('title')}
              placeholder="e.g. CS-401 Midterm"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Topic Tag</label>
            <input type="text" value={form.topic} onChange={setTopField('topic')}
              placeholder="e.g. Data Structures"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Time Limit (minutes)
            </label>
            <input
              type="number" min="1" max="300"
              value={form.duration}
              onChange={setTopField('duration')}
              placeholder="Leave blank for unlimited time"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
            {form.duration && (
              <p className="text-xs text-gray-400 mt-1">
                ⏱ Students will have {form.duration} minute{form.duration !== '1' ? 's' : ''} to complete this assessment. It will auto-submit when time runs out.
              </p>
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-5 py-3">
          <span className="font-semibold text-gray-800">{form.questions.length} question{form.questions.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span className="font-semibold text-gray-800">{totalMarks} total marks</span>
          {form.duration && <>
            <span>·</span>
            <span className="font-semibold text-gray-800">{form.duration} min time limit</span>
          </>}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {form.questions.map((q, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Question {idx + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}
                    className="w-7 h-7 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition disabled:opacity-30">↑</button>
                  <button onClick={() => moveQuestion(idx, 1)} disabled={idx === form.questions.length - 1}
                    className="w-7 h-7 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition disabled:opacity-30">↓</button>
                  {form.questions.length > 1 && (
                    <button onClick={() => removeQuestion(idx)}
                      className="w-7 h-7 rounded-md border border-red-100 text-xs text-red-400 hover:bg-red-50 transition">✕</button>
                  )}
                </div>
              </div>

              <textarea
                value={q.text}
                onChange={setQField(idx, 'text')}
                placeholder="Enter question text…"
                rows={3}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
              />

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
                    <option value="long">Long (3+ paragraphs)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Sample Answer <span className="text-gray-300">(used for AI grading)</span></label>
                <textarea
                  value={q.sampleAnswer}
                  onChange={setQField(idx, 'sampleAnswer')}
                  placeholder="Enter the ideal answer the AI will compare against…"
                  rows={4}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-gray-200 text-sm text-gray-500 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition font-medium"
        >
          + Add Question
        </button>
      </div>
    </div>
  );
}