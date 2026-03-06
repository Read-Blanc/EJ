import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

export default function AvailableAssessments() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();

  const [available, setAvailable] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('Available');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeOk,    setCodeOk]    = useState('');
  const [joining,   setJoining]   = useState(false);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);

    const [{ data: enrolled }, { data: subs }] = await Promise.all([
      supabase.from('assessment_students')
        .select('assessments(id, title, topic, status, duration_minutes, questions(id, marks))')
        .eq('student_id', user.id),
      supabase.from('submissions').select('assessment_id, status').eq('student_id', user.id),
    ]);

    const submittedIds = new Set((subs ?? []).map(s => s.assessment_id));

    const all = (enrolled ?? [])
      .map(row => row.assessments)
      .filter(Boolean)
      .map(a => ({
        id:       a.id,
        title:    a.title,
        topic:    a.topic,
        status:   a.status,
        questions: a.questions?.length ?? 0,
        maxMarks:  a.questions?.reduce((s, q) => s + (q.marks ?? 0), 0) ?? 0,
        duration:  a.duration_minutes,
        submitted: submittedIds.has(a.id),
      }));

    setAvailable(all.filter(a => a.status === 'Active' && !a.submitted));
    setCompleted(all.filter(a => a.submitted || a.status === 'Closed'));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setJoining(true); setCodeError(''); setCodeOk('');

    const { data: asm, error } = await supabase
      .from('assessments').select('id, title, status').eq('access_code', code).single();

    if (error || !asm) { setCodeError('Invalid code. Please check and try again.'); setJoining(false); return; }
    if (asm.status !== 'Active') { setCodeError('This assessment is not currently active.'); setJoining(false); return; }

    const { error: joinErr } = await supabase
      .from('assessment_students')
      .upsert({ student_id: user.id, assessment_id: asm.id }, { onConflict: 'student_id,assessment_id' });

    setJoining(false);
    if (joinErr) { setCodeError('Could not join. You may already be enrolled.'); return; }

    setCodeInput('');
    setCodeOk(`Joined "${asm.title}" successfully!`);
    setTimeout(() => setCodeOk(''), 4000);
    fetchAssessments();
  };

  const tabs = [
    { key: 'Available', count: available.length },
    { key: 'Completed', count: completed.length },
  ];
  const shown = activeTab === 'Available' ? available : completed;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">Assessments</div>
          <div className="text-xs text-gray-400">
            {loading ? 'Loading…' : `${available.length} available · ${completed.length} completed`}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Join by code */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-sm font-bold text-gray-900 mb-0.5">Join with Access Code</div>
          <p className="text-xs text-gray-400 mb-3">Enter the code your lecturer shared to enroll in an assessment.</p>
          <div className="flex gap-2">
            <input type="text" value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(''); setCodeOk(''); }}
              placeholder="e.g. ABCD-1234" maxLength={9}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-400 transition" />
            <button onClick={handleJoin} disabled={joining || !codeInput.trim()}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50">
              {joining ? 'Joining…' : 'Join'}
            </button>
          </div>
          {codeError && <p className="text-xs text-gray-600 mt-2">⚠ {codeError}</p>}
          {codeOk    && <p className="text-xs text-gray-700 font-semibold mt-2">✓ {codeOk}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 bg-white px-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors mb-[-1px] ${
                activeTab === t.key ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.key}
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Assessment cards */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="text-4xl mb-3">{activeTab === 'Available' ? '📋' : '✅'}</div>
            <p className="text-sm font-medium text-gray-700">
              {activeTab === 'Available' ? 'No available assessments' : 'No completed assessments'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'Available'
                ? 'Use the access code above to join one from your lecturer.'
                : 'Assessments you submit will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(a => (
              <div key={a.id}
                onClick={() => !a.submitted && a.status === 'Active' && navigate(`/student/take/${a.id}`, { state: { assessment: a } })}
                className={`bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 transition ${
                  !a.submitted && a.status === 'Active' ? 'hover:border-gray-400 hover:shadow-sm cursor-pointer' : 'opacity-75'
                }`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold text-gray-900 truncate">{a.title}</span>
                    {a.topic && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">{a.topic}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                    <span>{a.questions} question{a.questions !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{a.maxMarks} marks</span>
                    {a.duration && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-gray-700">{a.duration} min time limit</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {a.submitted ? (
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">Submitted ✓</span>
                  ) : a.status === 'Closed' ? (
                    <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full">Closed</span>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/student/take/${a.id}`, { state: { assessment: a } }); }}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition">
                      Start →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}