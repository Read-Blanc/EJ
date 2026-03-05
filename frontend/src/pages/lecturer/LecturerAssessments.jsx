import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileText, Clock, Users, BarChart3,
  Edit, Trash2, Eye, ToggleLeft, ToggleRight,
  BookOpen, AlertCircle, CheckCircle2, Archive,
  ChevronDown, Filter, Layers,
} from 'lucide-react';
import { lecturerApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';

const DIFFICULTY_COLORS = {
  easy:   { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  medium: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  hard:   { badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
};

const MOCK_ASSESSMENTS = [
  { id: 1, title: 'Introduction to Neural Networks', subject: 'Artificial Intelligence', total_marks: 100, duration_minutes: 90, difficulty: 'medium', is_active: true, question_count: 10, submission_count: 24, avg_score: 72, created_at: '2025-01-10' },
  { id: 2, title: 'Database Normalisation Concepts', subject: 'Database Systems', total_marks: 60, duration_minutes: 60, difficulty: 'easy', is_active: true, question_count: 6, submission_count: 31, avg_score: 81, created_at: '2025-01-14' },
  { id: 3, title: 'Operating System Scheduling', subject: 'Operating Systems', total_marks: 80, duration_minutes: 75, difficulty: 'hard', is_active: false, question_count: 8, submission_count: 18, avg_score: 58, created_at: '2025-01-20' },
  { id: 4, title: 'HTTP and REST Architecture', subject: 'Web Development', total_marks: 50, duration_minutes: 45, difficulty: 'easy', is_active: true, question_count: 5, submission_count: 0, avg_score: null, created_at: '2025-02-01' },
];

export default function LecturerAssessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadAssessments(); }, []);

  useEffect(() => {
    let result = [...assessments];
    if (searchQuery) result = result.filter(a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (statusFilter !== 'all') result = result.filter(a =>
      statusFilter === 'active' ? a.is_active : !a.is_active
    );
    if (difficultyFilter !== 'all') result = result.filter(a => a.difficulty === difficultyFilter);
    setFiltered(result);
  }, [assessments, searchQuery, statusFilter, difficultyFilter]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await lecturerApi.getAssessments();
      setAssessments(data?.length ? data : MOCK_ASSESSMENTS);
    } catch {
      setAssessments(MOCK_ASSESSMENTS);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (assessment) => {
    try {
      await lecturerApi.updateAssessment(assessment.id, { is_active: !assessment.is_active });
      setAssessments(prev => prev.map(a =>
        a.id === assessment.id ? { ...a, is_active: !a.is_active } : a
      ));
      toast.success(`Assessment ${assessment.is_active ? 'archived' : 'published'} successfully`);
    } catch {
      toast.error('Failed to update assessment status');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await lecturerApi.deleteAssessment(deleteModal.id);
      setAssessments(prev => prev.filter(a => a.id !== deleteModal.id));
      toast.success('Assessment deleted');
      setDeleteModal(null);
    } catch {
      toast.error('Failed to delete assessment');
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: assessments.length,
    active: assessments.filter(a => a.is_active).length,
    totalSubmissions: assessments.reduce((s, a) => s + (a.submission_count || 0), 0),
    avgScore: assessments.filter(a => a.avg_score).length
      ? Math.round(assessments.filter(a => a.avg_score).reduce((s, a) => s + a.avg_score, 0) / assessments.filter(a => a.avg_score).length)
      : 0,
  };

  if (loading) return <LoadingState />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
            <p className="text-gray-500 mt-1">Create and manage your theory assessments</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/lecturer/assessments/create')}
            className="flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Create Assessment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: <Layers className="w-5 h-5" />, color: 'bg-brand-50 text-brand-600' },
            { label: 'Published', value: stats.active, icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
            { label: 'Submissions', value: stats.totalSubmissions, icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
            { label: 'Avg Score', value: `${stats.avgScore}%`, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Search by title or subject…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-700">
              <option value="all">All Status</option>
              <option value="active">Published</option>
              <option value="inactive">Archived</option>
            </select>
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-700">
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </CardContent>
        </Card>

        {/* Assessment List */}
        {filtered.length === 0 ? (
          <EmptyState onCreateClick={() => navigate('/lecturer/assessments/create')} />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((assessment, i) => (
                <motion.div key={assessment.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.05 }}>
                  <AssessmentCard
                    assessment={assessment}
                    onToggle={() => handleToggleStatus(assessment)}
                    onEdit={() => navigate(`/lecturer/assessments/${assessment.id}/edit`)}
                    onView={() => navigate(`/lecturer/assessments/${assessment.id}`)}
                    onDelete={() => setDeleteModal(assessment)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteModal
            assessment={deleteModal}
            deleting={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssessmentCard({ assessment, onToggle, onEdit, onView, onDelete }) {
  const diff = DIFFICULTY_COLORS[assessment.difficulty] || DIFFICULTY_COLORS.medium;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${diff.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${assessment.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {assessment.is_active ? <CheckCircle2 className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                {assessment.is_active ? 'Published' : 'Archived'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">{assessment.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{assessment.subject}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-gray-400" />{assessment.question_count ?? '—'} questions</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" />{assessment.duration_minutes} min</span>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-400" />{assessment.total_marks} marks</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" />{assessment.submission_count ?? 0} submissions</span>
              {assessment.avg_score != null && (
                <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-gray-400" />Avg {assessment.avg_score}%</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onToggle} title={assessment.is_active ? 'Archive' : 'Publish'}
              className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
              {assessment.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button onClick={onView} title="View"
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Eye className="w-5 h-5" />
            </button>
            <button onClick={onEdit} title="Edit"
              className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
              <Edit className="w-5 h-5" />
            </button>
            <button onClick={onDelete} title="Delete"
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FileText className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessments found</h3>
      <p className="text-gray-500 mb-6">Create your first assessment to get started.</p>
      <Button variant="primary" onClick={onCreateClick}>
        <Plus className="w-4 h-4 mr-2" /> Create Assessment
      </Button>
    </div>
  );
}

function DeleteModal({ assessment, deleting, onConfirm, onCancel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Assessment?</h3>
        <p className="text-gray-500 text-center text-sm mb-6">
          "<span className="font-medium text-gray-700">{assessment.title}</span>" will be permanently deleted along with all its questions and submissions. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading assessments…</p>
        </div>
      </div>
    </div>
  );
}