import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const COMPLETED_MOCK = []; // wire up when backend supports it

export default function AvailableAssessments() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [available,  setAvailable]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('Available');
  const [codeInput,  setCodeInput]  = useState('');
  const [codeError,  setCodeError]  = useState('');
  const [joining,    setJoining]    = useState(false);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assessment_students')
      .select('assessments(id, title, topic, status, questions(id))')
      .eq('student_id', user.id);

    if (error || !data) { setAvailable([]); setLoading(false); return; }

    setAvailable(
      data
        .map(row => row.assessments)
        .filter(a => a && a.status === 'Active')
        .map(a => ({ id: a.id, title: a.title, topic: a.topic, questions: a.questions?.length ?? 0 }))
    );
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setJoining(true); setCodeError('');

    const { data: assessment, error } = await supabase
      .from('assessments')
      .select('id, title, status')
      .eq('code', code)
      .single();

    if (error || !assessment) { setCodeError('Invalid code. Please check and try again.'); setJoining(false); return; }
    if (assessment.status !== 'Active') { setCodeError('This assessment is not currently active.'); setJoining(false); return; }

    const { error: joinErr } = await supabase
      .from('assessment_students')
      .upsert({ student_id: user.id, assessment_id: assessment.id }, { onConflict: 'student_id,assessment_id' });

    setJoining(false);
    if (joinErr) { setCodeError('Could not join. You may already be enrolled.'); return; }

    setCodeInput('');
    fetchAssessments();
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">Assessments</div>
          <div className="text-xs text-gray-400">
            {loading ? 'Loading…' : `${available.length} available · ${COMPLETED_MOCK.length} completed`}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 bg-white">
        {['Available', 'Completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors mb-[-1px] ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab}
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab === 'Available' ? available.length : COMPLETED_MOCK.length}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6 space-y-3">
        {activeTab === 'Available' && (
          <>
            {/* Join by code */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="font-semibold text-gray-900 text-sm mb-1">Join an Assessment</div>
              <div className="text-xs text-gray-400 mb-4">Enter the code shared by your lecturer.</div>
              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ABCD-1234"
                  value={codeInput}
                  maxLength={9}
                  spellCheck={false}
                  onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(''); }}
                  className={`flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
                    codeError ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <button
                  type="submit"
                  disabled={joining || !codeInput.trim()}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </form>
              {codeError && <p className="text-xs text-red-500 mt-2">{codeError}</p>}
            </div>

            {/* Assessment list */}
            {loading ? (
              <div className="text-center py-10 text-sm text-gray-400">Loading your assessments…</div>
            ) : available.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">No active assessments yet. Enter a code above to join one.</div>
            ) : available.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{a.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {a.topic || 'No topic'} · {a.questions} question{a.questions !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/student/take/${a.id}`, { state: { assessment: a } })}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
                >
                  Start
                </button>
              </div>
            ))}
          </>
        )}

        {activeTab === 'Completed' && (
          COMPLETED_MOCK.length === 0
            ? <div className="text-center py-10 text-sm text-gray-400">No completed assessments yet.</div>
            : COMPLETED_MOCK.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-700">
                  {a.title}
                </div>
              ))
        )}
      </div>
    </div>
  );
}