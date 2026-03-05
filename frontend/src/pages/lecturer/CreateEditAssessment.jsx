import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Save, Plus, Trash2, BookOpen,
  FileText, Clock, Target, AlignLeft, Layers,
  CheckCircle2, AlertCircle, GripVertical, Search,
} from 'lucide-react';
import { lecturerApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';

const MOCK_QUESTIONS = [
  { id: 1, question_text: 'Explain the concept of backpropagation in neural networks.', subject: 'Artificial Intelligence', topic: 'Deep Learning', max_score: 10, difficulty: 'medium' },
  { id: 2, question_text: 'What is normalisation in databases and why is it important?', subject: 'Database Systems', topic: 'Normalisation', max_score: 10, difficulty: 'easy' },
  { id: 3, question_text: 'Describe the differences between process scheduling algorithms.', subject: 'Operating Systems', topic: 'Scheduling', max_score: 10, difficulty: 'hard' },
  { id: 4, question_text: 'Explain REST principles and HTTP methods.', subject: 'Web Development', topic: 'APIs', max_score: 10, difficulty: 'easy' },
  { id: 5, question_text: 'What are the key properties of ACID transactions?', subject: 'Database Systems', topic: 'Transactions', max_score: 10, difficulty: 'medium' },
];

const EMPTY_FORM = {
  title: '', description: '', subject: '', difficulty: 'medium',
  total_marks: '', duration_minutes: '', is_active: false,
};

export default function CreateEditAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'questions'

  useEffect(() => {
    loadQuestions();
    if (isEdit) loadAssessment();
  }, [id, isEdit, loadAssessment]);

  const loadQuestions = async () => {
    try {
      const data = await lecturerApi.getQuestions();
      setAvailableQuestions(data?.length ? data : MOCK_QUESTIONS);
    } catch {
      setAvailableQuestions(MOCK_QUESTIONS);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await lecturerApi.getAssessment(id);
      setForm({
        title: data.title || '',
        description: data.description || '',
        subject: data.subject || '',
        difficulty: data.difficulty || 'medium',
        total_marks: data.total_marks || '',
        duration_minutes: data.duration_minutes || '',
        is_active: data.is_active ?? false,
      });
      setSelectedQuestions(data.questions || []);
    } catch {
      toast.error('Failed to load assessment');
      navigate('/lecturer/assessments');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.duration_minutes || form.duration_minutes < 5) e.duration_minutes = 'Duration must be at least 5 minutes';
    if (!form.total_marks || form.total_marks < 1) e.total_marks = 'Total marks must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { toast.error('Please fix the form errors'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_marks: Number(form.total_marks),
        duration_minutes: Number(form.duration_minutes),
        question_ids: selectedQuestions.map(q => q.id),
      };
      if (isEdit) {
        await lecturerApi.updateAssessment(id, payload);
        toast.success('Assessment updated successfully');
      } else {
        await lecturerApi.createAssessment(payload);
        toast.success('Assessment created successfully');
      }
      navigate('/lecturer/assessments');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const addQuestion = (q) => {
    if (selectedQuestions.find(s => s.id === q.id)) { toast.error('Question already added'); return; }
    setSelectedQuestions(prev => [...prev, q]);
  };

  const removeQuestion = (id) => setSelectedQuestions(prev => prev.filter(q => q.id !== id));

  const filteredAvailable = availableQuestions.filter(q =>
    !selectedQuestions.find(s => s.id === q.id) &&
    (q.question_text.toLowerCase().includes(questionSearch.toLowerCase()) ||
     q.subject.toLowerCase().includes(questionSearch.toLowerCase()))
  );

  const computedMarks = selectedQuestions.reduce((s, q) => s + (q.max_score || 0), 0);

  if (loading) return <LoadingState />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/lecturer/assessments')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Assessment' : 'Create Assessment'}</h1>
              <p className="text-xs text-gray-500">{selectedQuestions.length} questions · {computedMarks} marks</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">Publish immediately</span>
              <div className="relative">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="sr-only peer" />
                <div className="w-10 h-5 rounded-full bg-gray-200 peer-checked:bg-brand-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
            <Button variant="primary" onClick={handleSubmit} disabled={saving} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Assessment'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-6">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
            {[
              { key: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
              { key: 'questions', label: `Questions (${selectedQuestions.length})`, icon: <BookOpen className="w-4 h-4" /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle>Assessment Details</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <Field label="Title" error={errors.title}>
                      <input name="title" value={form.title} onChange={handleChange}
                        placeholder="e.g. Introduction to Neural Networks"
                        className={inputClass(errors.title)} />
                    </Field>
                    <Field label="Description (optional)">
                      <textarea name="description" value={form.description} onChange={handleChange}
                        rows={3} placeholder="Describe what this assessment covers…"
                        className={`${inputClass()} resize-none`} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Subject" error={errors.subject}>
                        <input name="subject" value={form.subject} onChange={handleChange}
                          placeholder="e.g. Artificial Intelligence"
                          className={inputClass(errors.subject)} />
                      </Field>
                      <Field label="Difficulty">
                        <select name="difficulty" value={form.difficulty} onChange={handleChange}
                          className={inputClass()}>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </Field>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Timing & Marks</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Duration (minutes)" error={errors.duration_minutes}>
                        <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange}
                          min="5" placeholder="60" className={inputClass(errors.duration_minutes)} />
                      </Field>
                      <Field label="Total Marks" error={errors.total_marks}>
                        <input type="number" name="total_marks" value={form.total_marks} onChange={handleChange}
                          min="1" placeholder="100" className={inputClass(errors.total_marks)} />
                      </Field>
                    </div>
                    {computedMarks > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Questions total: <span className="font-medium text-brand-600">{computedMarks} marks</span>
                        {computedMarks !== Number(form.total_marks) && form.total_marks && (
                          <span className="text-yellow-600 ml-2">⚠ Mismatch with total marks</span>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar info */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                    <div className="space-y-2 text-sm">
                      {[
                        { icon: <BookOpen className="w-4 h-4" />, label: 'Questions', value: selectedQuestions.length },
                        { icon: <Target className="w-4 h-4" />, label: 'Marks', value: form.total_marks || '—' },
                        { icon: <Clock className="w-4 h-4" />, label: 'Duration', value: form.duration_minutes ? `${form.duration_minutes} min` : '—' },
                        { icon: <Layers className="w-4 h-4" />, label: 'Difficulty', value: form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1) },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <span className="flex items-center gap-2 text-gray-500">{r.icon}{r.label}</span>
                          <span className="font-medium text-gray-900">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-2">Tips</h3>
                    <ul className="text-xs text-gray-500 space-y-1.5">
                      <li>• Add questions first, then set the total marks</li>
                      <li>• Publish when you're ready for students</li>
                      <li>• Duration should allow 1.5–2 min per mark</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
              {/* Selected Questions */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Selected Questions ({selectedQuestions.length})</h2>
                {selectedQuestions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No questions added yet. Browse the question bank on the right.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {selectedQuestions.map((q) => (
                      <Card key={q.id}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <GripVertical className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 line-clamp-2">{q.question_text}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                              <span>{q.subject}</span>
                              <span>·</span>
                              <span>{q.max_score} marks</span>
                            </div>
                          </div>
                          <button onClick={() => removeQuestion(q.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Question Bank */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Question Bank</h2>
                  <span className="text-xs text-gray-500">{filteredAvailable.length} available</span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Search questions…" value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} />
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredAvailable.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-sm text-gray-400">No matching questions</CardContent></Card>
                  ) : filteredAvailable.map(q => (
                    <Card key={q.id} className="hover:border-brand-300 transition-colors cursor-pointer" onClick={() => addQuestion(q)}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">{q.question_text}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <span>{q.subject}</span>
                            <span>·</span>
                            <span>{q.max_score} marks</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{q.difficulty}</span>
                          </div>
                        </div>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0">
                          <Plus className="w-4 h-4" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

const inputClass = (err) => `w-full px-3 py-2.5 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white ${err ? 'border-red-300' : 'border-gray-200'}`;

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading assessment…</p>
        </div>
      </div>
    </div>
  );
}