import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

export default function CreateEditQuestion() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const { id }    = useParams();           // present when editing
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    text: '', marks: '', answerLength: 'medium', sampleAnswer: '', assessmentId: '',
  });
  const [assessments, setAssessments] = useState([]);
  const [loading,     setLoading]     = useState(isEditing);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // Load assessments for the dropdown
  useEffect(() => {
    supabase.from('assessments').select('id, title').eq('created_by', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setAssessments(data ?? []));
  }, [user.id]);

  // Load existing question when editing
  useEffect(() => {
    if (!isEditing) return;
    supabase.from('questions').select('text, marks, answer_length, sample_answer, assessment_id').eq('id', id).single()
      .then(({ data }) => {
        if (data) setForm({
          text: data.text ?? '', marks: String(data.marks ?? ''),
          answerLength: data.answer_length ?? 'medium',
          sampleAnswer: data.sample_answer ?? '',
          assessmentId: data.assessment_id ?? '',
        });
        setLoading(false);
      });
  }, [id, isEditing]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.text.trim())        { setError('Question text is required.'); return; }
    if (!form.assessmentId)       { setError('Please select an assessment.'); return; }
    setError(''); setSaving(true);

    const payload = {
      text:          form.text.trim(),
      marks:         parseInt(form.marks, 10) || 0,
      answer_length: form.answerLength,
      sample_answer: form.sampleAnswer.trim(),
      assessment_id: form.assessmentId,
    };

    let err;
    if (isEditing) {
      ({ error: err } = await supabase.from('questions').update(payload).eq('id', id));
    } else {
      ({ error: err } = await supabase.from('questions').insert({ ...payload, order_index: 0 }));
    }

    setSaving(false);
    if (err) { setError('Failed to save question. Please try again.'); return; }
    navigate('/lecturer/questions');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 p-10">Loading…</div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => navigate('/lecturer/questions')} className="hover:text-gray-700 transition">Question Bank</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{isEditing ? 'Edit Question' : 'New Question'}</span>
        </nav>
        <div className="flex gap-2">
          <button onClick={() => navigate('/lecturer/questions')} disabled={saving}
            className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-40">
            {saving ? 'Saving…' : isEditing ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 max-w-xl">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assessment *</label>
            <select value={form.assessmentId} onChange={set('assessmentId')}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Select an assessment…</option>
              {assessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question Text *</label>
            <textarea value={form.text} onChange={set('text')} placeholder="Enter the question…" rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Marks</label>
              <input type="number" min="1" max="100" value={form.marks} onChange={set('marks')} placeholder="10"
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Expected Length</label>
              <select value={form.answerLength} onChange={set('answerLength')}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="short">Short (1–2 sentences)</option>
                <option value="medium">Medium (1–2 paragraphs)</option>
                <option value="long">Long (essay)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Sample Answer <span className="text-gray-300 normal-case font-normal">(used by AI grader)</span>
            </label>
            <textarea value={form.sampleAnswer} onChange={set('sampleAnswer')} placeholder="Enter model answer here…" rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}