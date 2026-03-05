// src/pages/lecturer/QuestionBankPage.jsx
// Manage question bank - create, edit, delete questions

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { lecturerApi } from '../../api/endpoints';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';

export default function QuestionBank() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, []);


  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await lecturerApi.getQuestions();
      setQuestions(data);
      setFilteredQuestions(data);
      toast.success('Questions loaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load questions');
      // Use mock data
      const mockData = getMockQuestions();
      setQuestions(mockData);
      setFilteredQuestions(mockData);
    } finally {
      setLoading(false);
    }
  };

const filterQuestions = useCallback(() => {
  let filtered = [...questions];

  if (searchQuery) {
    filtered = filtered.filter(
      (q) =>
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (selectedSubject !== 'all') {
    filtered = filtered.filter((q) => q.subject === selectedSubject);
  }

  if (selectedDifficulty !== 'all') {
    filtered = filtered.filter((q) => q.difficulty === selectedDifficulty);
  }

  setFilteredQuestions(filtered);
}, [questions, searchQuery, selectedSubject, selectedDifficulty]);

 useEffect(() => {
    filterQuestions();
  }, [filterQuestions]);

  const handleDelete = async () => {
    try {
      await lecturerApi.deleteQuestion(questionToDelete.id);
      setQuestions(questions.filter((q) => q.id !== questionToDelete.id));
      toast.success('Question deleted successfully');
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete question');
    }
  };

  const handleDuplicate = async (question) => {
    try {
      const duplicated = {
        ...question,
        question_text: `${question.question_text} (Copy)`,
      };
      delete duplicated.id;
      const newQuestion = await lecturerApi.createQuestion(duplicated);
      setQuestions([newQuestion, ...questions]);
      toast.success('Question duplicated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to duplicate question');
    }
  };

  const subjects = ['all', ...new Set(questions.map((q) => q.subject))];

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="lecturer" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-600">Loading questions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="lecturer" />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Bank</h1>
            <p className="text-gray-600">
              Manage your assessment questions ({questions.length} total)
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/lecturer/questions/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Question
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Questions" value={questions.length} color="blue" />
          <StatCard
            label="Easy"
            value={questions.filter((q) => q.difficulty === 'easy').length}
            color="green"
          />
          <StatCard
            label="Medium"
            value={questions.filter((q) => q.difficulty === 'medium').length}
            color="yellow"
          />
          <StatCard
            label="Hard"
            value={questions.filter((q) => q.difficulty === 'hard').length}
            color="red"
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={Search}
                />
              </div>

              <div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                >
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject === 'all' ? 'All Subjects' : subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {(searchQuery || selectedSubject !== 'all' || selectedDifficulty !== 'all') && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>
                  Showing {filteredQuestions.length} of {questions.length} questions
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubject('all');
                    setSelectedDifficulty('all');
                  }}
                  className="ml-2 text-brand-600 hover:text-brand-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions List */}
        {filteredQuestions.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                onDelete={(q) => {
                  setQuestionToDelete(q);
                  setShowDeleteModal(true);
                }}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && questionToDelete && (
        <DeleteModal
          question={questionToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setQuestionToDelete(null);
          }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <div className="flex items-center justify-between">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${colors[color]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// Question Card Component
function QuestionCard({ question, index, onDelete, onDuplicate }) {
  const navigate = useNavigate();

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card hoverable>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[question.difficulty]}`}>
                    {question.difficulty}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">{question.subject}</span>
                </div>
              </div>

              <p className="text-gray-900 mb-2 line-clamp-2">{question.question_text}</p>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{question.marks} marks</span>
                {question.created_at && (
                  <span>
                    Created: {new Date(question.created_at).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/lecturer/questions/${question.id}`)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/lecturer/questions/${question.id}/edit`)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDuplicate(question)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(question)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Empty State
function EmptyState({ searchQuery }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <BookOpen className="w-8 h-8 text-gray-400" />
        </div>

        {searchQuery ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first question</p>
            <Button variant="primary" onClick={() => navigate('/lecturer/questions/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Question
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Delete Modal
function DeleteModal({ question, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Question?</h3>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-500 italic line-clamp-2">
              "{question.question_text}"
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete Question
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Mock questions data - Nigerian University Context
function getMockQuestions() {
  return [
    {
      id: 1,
      question_text: 'Explain the concept of Object-Oriented Programming (OOP) and discuss its four main principles with relevant examples from real-world applications.',
      subject: 'Computer Science',
      difficulty: 'medium',
      marks: 20,
      model_answer: 'OOP is a programming paradigm based on objects containing data and code...',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 2,
      question_text: 'Define set theory and explain the operations of union, intersection, and complement with appropriate Venn diagrams.',
      subject: 'Mathematics',
      difficulty: 'easy',
      marks: 15,
      model_answer: 'Set theory is a branch of mathematics that deals with collections of objects...',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 3,
      question_text: 'Discuss Newton\'s laws of motion and provide practical examples of each law in everyday life.',
      subject: 'Physics',
      difficulty: 'medium',
      marks: 20,
      model_answer: 'Newton\'s first law states that an object at rest stays at rest...',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 4,
      question_text: 'Explain the periodic table organization and discuss the trends in atomic radius, ionization energy, and electronegativity across periods and groups.',
      subject: 'Chemistry',
      difficulty: 'hard',
      marks: 25,
      model_answer: 'The periodic table is organized by atomic number and electron configuration...',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 5,
      question_text: 'Describe the structure and function of DNA. Explain how genetic information is stored and transmitted.',
      subject: 'Biology',
      difficulty: 'medium',
      marks: 20,
      model_answer: 'DNA (Deoxyribonucleic Acid) is a double helix structure...',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 6,
      question_text: 'Analyze the major themes in Chinua Achebe\'s "Things Fall Apart" and discuss their relevance to Nigerian society.',
      subject: 'English',
      difficulty: 'hard',
      marks: 25,
      model_answer: 'Things Fall Apart explores themes of colonialism, tradition vs change...',
      created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    },
    {
      id: 7,
      question_text: 'Explain the law of demand and supply. How do they interact to determine market equilibrium?',
      subject: 'Economics',
      difficulty: 'medium',
      marks: 15,
      model_answer: 'The law of demand states that as price increases, quantity demanded decreases...',
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
    {
      id: 8,
      question_text: 'What is the accounting equation? Explain with examples how business transactions affect it.',
      subject: 'Accounting',
      difficulty: 'easy',
      marks: 10,
      model_answer: 'The accounting equation is: Assets = Liabilities + Equity...',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
  ];
}