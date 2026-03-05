import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const FILTERS = ['All', 'Draft', 'Active', 'Closed'];
const BLANK_QUESTION = { text: '', marks: '', answerLength: 'medium', sampleAnswer: '' };
const BLANK_FORM     = { title: '', topic: '', questions: [{ ...BLANK_QUESTION }] };

function statusClass(s) {
  return { Active: 'bg-green-100 text-green-700', Draft: 'bg-gray-100 text-gray-500', Closed: 'bg-red-100 text-red-600' }[s] ?? 'bg-gray-100 text-gray-500';
}

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part  = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(4)}-${part(4)}`;
}

export default function LecturerAssessments() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();

  const [assessments,     setAssessments]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [fetchError,      setFetchError]      = useState('');
  const [activeFilter,    setActiveFilter]    = useState('All');
  const [panelOpen,       setPanelOpen]       = useState(false);
  const [editingId,       setEditingId]       = useState(null);
  const [form,            setForm]            = useState(BLANK_FORM);
  const [saving,          setSaving]          = useState(false);
  const [toast,           setToast]           = useState('');
  const [copiedId,        setCopiedId]        = useState(null);
  const [mutating,        setMutating]        = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchAssessments = useCallback(async () => {
    setLoading(true); setFetchError('');
    const { data, error } = await supabase
      .from('assessments')
      .select('id, title, topic, status, access_code, created_at, questions(id, marks)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) { setFetchError('Failed to load assessments.'); setLoading(false); return; }

    setAssessments((data ?? []).map(a => {
      const qs = a.questions ?? [];
      return {
        id: a.id, title: a.title, topic: a.topic, status: a.status,
        accessCode: a.access_code,
        questions: qs.length,
        maxMarks: qs.reduce((s, q) => s + (q.marks || 0), 0),
        submissions: 0,
      };
    }));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const counts = FILTERS.reduce((acc, f) => ({
    ...acc, [f]: f === 'All' ? assessments.length : assessments.filter(a => a.status === f).length,
  }), {});

  const visible = activeFilter === 'All' ? assessments : assessments.filter(a => a.status === activeFilter);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const openCreatePanel = () => { setForm(BLANK_FORM); setEditingId(null); setPanelOpen(true); };

  const openEditPanel = async (a) => {
    setEditingId(a.id); setPanelOpen(true);
    setForm({ title: a.title, topic: a.topic ?? '', questions: [{ ...BLANK_QUESTION }] });
    const { data } = await supabase.from('questions').select('text, marks, answer_length, sample_answer').eq('assessment_id', a.id).order('order_index');
    if (!data || data.length === 0) return;
    setForm(prev => ({
      ...prev,
      questions: data.map(q => ({ text: q.text, marks: String(q.marks), answerLength: q.answer_length, sampleAnswer: q.sample_answer || '' })),
    }));
  };

  const closePanel = () => { if (saving) return; setPanelOpen(false); setEditingId(null); };

  const setTopField   = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setQField     = (idx, field) => (e) => setForm(prev => {
    const qs = [...prev.questions]; qs[idx] = { ...qs[idx], [field]: e.target.value }; return { ...prev, questions: qs };
  });
  const addQuestion   = () => setForm(prev => ({ ...prev, questions: [...prev.questions, { ...BLANK_QUESTION }] }));
  const removeQuestion = (idx) => setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));

  const saveAssessment = async (status) => {
    setSaving(true);
    try {
      let assessmentId;
      if (editingId) {
        const updateData = { title: form.title, topic: form.topic, status };
        if (status === 'Active') updateData.access_code = generateAccessCode();
        const { error: aErr } = await supabase.from('assessments').update(updateData).eq('id', editingId);
        if (aErr) throw aErr;
        await supabase.from('questions').delete().eq('assessment_id', editingId);
        assessmentId = editingId;
      } else {
        const insertData = { title: form.title, topic: form.topic, status, created_by: user.id };
        if (status === 'Active') insertData.access_code = generateAccessCode();
        const { data: assessment, error: aErr } = await supabase.from('assessments').insert(insertData).select().single();
        if (aErr) throw aErr;
        assessmentId = assessment.id;
      }
      const { error: qErr } = await supabase.from('questions').insert(
        form.questions.map((q, i) => ({
          assessment_id: assessmentId, order_index: i, text: q.text,
          marks: parseInt(q.marks, 10) || 0, answer_length: q.answerLength, sample_answer: q.sampleAnswer,
        }))
      );
      if (qErr) throw qErr;
      closePanel();
      showToast(editingId ? 'Assessment updated.' : status === 'Draft' ? 'Saved as draft.' : 'Assessment published!');
      fetchAssessments();
    } catch { showToast('Something went wrong. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleClose = async (id) => {
    setMutating(true);
    const { error } = await supabase.from('assessments').update({ status: 'Closed' }).eq('id', id);
    if (error) showToast('Failed to close assessment.'); else { showToast('Assessment closed.'); fetchAssessments(); }
    setMutating(false);
  };

  const handleReopen = async (id) => {
    setMutating(true);
    const { error } = await supabase.from('assessments').update({ status: 'Active' }).eq('id', id);
    if (error) showToast('Failed to reopen assessment.'); else { showToast('Assessment reopened.'); fetchAssessments(); }
    setMutating(false);
  };

  const handleDelete = async (id) => {
    setMutating(true);
    try {
      const { data: subs } = await supabase.from('submissions').select('id').eq('assessment_id', id);
      if (subs?.length) {
        const ids = subs.map(s => s.id);
        await supabase.from('answers').delete().in('submission_id', ids);
        await supabase.from('submissions').delete().eq('assessment_id', id);
      }
      await supabase.from('student_assessments').delete().eq('assessment_id', id);
      await supabase.from('questions').delete().eq('assessment_id', id);
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
      setConfirmDeleteId(null); showToast('Assessment deleted.'); fetchAssessments();
    } catch { showToast('Failed to delete assessment.'); }
    finally { setMutating(false); }
  };

  const copyCode = (id, code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">Assessments</div>
          <div className="text-xs text-gray-400">{loading ? 'Loading…' : `${assessments.length} total`}</div>
        </div>
        <button onClick={openCreatePanel} className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
          + Create Assessment
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 bg-white">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors mb-[-1px] ${activeFilter === f ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {f}
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${activeFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mx-6 my-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        {fetchError ? (
          <div className="p-10 text-center text-sm text-red-500">{fetchError}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Assessment', 'Topic', 'Questions', 'Max Marks', 'Submissions', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">Loading assessments…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  {activeFilter === 'All' ? 'No assessments yet. Click "+ Create Assessment" to get started.' : `No ${activeFilter.toLowerCase()} assessments.`}
                </td></tr>
              ) : visible.map(a => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.title}</div>
                    {a.status === 'Active' && a.accessCode && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{a.accessCode}</span>
                        <button onClick={() => copyCode(a.id, a.accessCode)} className="text-xs text-indigo-500 hover:underline">
                          {copiedId === a.id ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.topic || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{a.questions}</td>
                  <td className="px-4 py-3 text-gray-700">{a.maxMarks}</td>
                  <td className="px-4 py-3 text-gray-700">{a.submissions}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(a.status)}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.status === 'Draft'  && <button onClick={() => openEditPanel(a)} className="px-2.5 py-1 border border-gray-200 text-xs text-gray-700 rounded-md hover:bg-gray-50 transition">Edit</button>}
                      {a.status === 'Active' && <button onClick={() => navigate('/lecturer/grading')} className="px-2.5 py-1 border border-indigo-200 text-xs text-indigo-700 rounded-md hover:bg-indigo-50 transition">Grade</button>}
                      {a.status === 'Closed' && <button onClick={() => handleReopen(a.id)} disabled={mutating} className="px-2.5 py-1 border border-green-200 text-xs text-green-700 rounded-md hover:bg-green-50 transition disabled:opacity-50">Reopen</button>}
                      {(a.status === 'Draft' || a.status === 'Active') && (
                        <button onClick={() => handleClose(a.id)} disabled={mutating} className="px-2.5 py-1 border border-gray-200 text-xs text-gray-500 rounded-md hover:bg-gray-50 transition disabled:opacity-50">Close</button>
                      )}
                      {confirmDeleteId === a.id ? (
                        <>
                          <span className="text-xs font-semibold text-red-600">Sure?</span>
                          <button onClick={() => handleDelete(a.id)} disabled={mutating} className="px-2.5 py-1 border border-red-200 text-xs text-red-600 rounded-md hover:bg-red-50 transition disabled:opacity-50">{mutating ? '…' : 'Delete'}</button>
                          <button onClick={() => setConfirmDeleteId(null)} disabled={mutating} className="px-2.5 py-1 border border-gray-200 text-xs text-gray-500 rounded-md hover:bg-gray-50 transition">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(a.id)} className="px-2.5 py-1 border border-red-100 text-xs text-red-500 rounded-md hover:bg-red-50 transition">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap animate-[fadeIn_0.2s_ease]">
          {toast}
        </div>
      )}

      {/* Backdrop */}
      {panelOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={closePanel} />}

      {/* Slide-out panel */}
      <aside className={`fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-50 transition-transform duration-300 ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="text-base font-bold text-gray-900">{editingId ? 'Edit Assessment' : 'Create Assessment'}</div>
          <button onClick={closePanel} disabled={saving} className="w-8 h-8 bg-gray-100 rounded-md text-sm hover:bg-gray-200 transition flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Assessment Title</label>
            <input type="text" placeholder="e.g. CS-401 Midterm" value={form.title} onChange={setTopField('title')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Topic Tag</label>
            <input type="text" placeholder="e.g. Data Structures" value={form.topic} onChange={setTopField('topic')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Questions</div>
            {form.questions.map((q, idx) => (
              <div key={idx} className="mb-4 bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Question {idx + 1}</span>
                  {form.questions.length > 1 && (
                    <button onClick={() => removeQuestion(idx)} className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
                  )}
                </div>
                <textarea placeholder="Enter question text…" value={q.text} onChange={setQField(idx, 'text')} rows={3}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Marks</label>
                    <input type="number" min="1" max="20" placeholder="10" value={q.marks} onChange={setQField(idx, 'marks')}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Expected Length</label>
                    <select value={q.answerLength} onChange={setQField(idx, 'answerLength')}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                      <option value="short">Short (1–2 sentences)</option>
                      <option value="medium">Medium (1–2 paragraphs)</option>
                      <option value="long">Long (essay)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sample Answer (for AI grading)</label>
                  <textarea placeholder="Enter model answer…" value={q.sampleAnswer} onChange={setQField(idx, 'sampleAnswer')} rows={4}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
                </div>
              </div>
            ))}
            <button onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 rounded-xl transition">
              + Add Question
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
          <button onClick={closePanel} disabled={saving} className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={(e) => { e.preventDefault(); if (form.title.trim()) saveAssessment('Draft'); }} disabled={saving}
            className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={(e) => { e.preventDefault(); if (form.title.trim()) saveAssessment('Active'); }} disabled={saving}
            className="flex-1 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50">
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </aside>
    </div>
  );
}