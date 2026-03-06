import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

function StudentModal({ student, onClose }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    supabase
      .from('submissions')
      .select('id, status, submitted_at, assessments(title, topic, questions(marks)), answers(marks_awarded)')
      .eq('student_id', student.id)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setSubs((data ?? []).map(s => {
          const maxM  = s.assessments?.questions?.reduce((sum, q) => sum + (q.marks ?? 0), 0) ?? 0;
          const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
          const pct   = s.status === 'Graded' && maxM > 0 ? Math.round((award / maxM) * 100) : null;
          return {
            id:     s.id,
            title:  s.assessments?.title ?? '—',
            topic:  s.assessments?.topic ?? '',
            status: s.status,
            award, maxM, pct,
            date: s.submitted_at
              ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—',
          };
        }));
        setLoading(false);
      });
  }, [student]);

  if (!student) return null;

  const graded = subs.filter(s => s.pct !== null);
  const avg    = graded.length ? Math.round(graded.reduce((sum, s) => sum + s.pct, 0) / graded.length) : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gray-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
              {initials(student.name)}
            </div>
            <div>
              <div className="font-bold text-gray-900">{student.name}</div>
              <div className="text-xs text-gray-400">{student.email}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {subs.length} submission{subs.length !== 1 ? 's' : ''}
                </span>
                {avg !== null && (
                  <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-semibold">
                    Avg {avg}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm transition">
            ✕
          </button>
        </div>

        {/* Enrolled in */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Enrolled in</p>
          <div className="flex flex-wrap gap-1.5">
            {student.assessments.length === 0
              ? <span className="text-xs text-gray-400">No assessments</span>
              : student.assessments.map((t, i) => (
                <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
              ))}
          </div>
        </div>

        {/* Submissions */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">Loading…</div>
          ) : subs.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">No submissions yet.</div>
          ) : subs.map(s => (
            <div key={s.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{s.title}</div>
                <div className="text-xs text-gray-400">{s.topic || 'No topic'} · {s.date}</div>
              </div>
              <div className="shrink-0">
                {s.status === 'Graded' && s.pct !== null ? (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{s.award}/{s.maxM}</div>
                    <div className="text-sm font-bold text-gray-900">{s.pct}%</div>
                  </div>
                ) : (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mini trend */}
        {graded.length > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Score trend</p>
            <div className="flex items-end gap-0.5 h-8">
              {[...graded].reverse().map((s, i) => (
                <div key={i} className="flex-1 bg-gray-900 rounded-sm"
                  style={{ height: `${Math.max(10, s.pct)}%` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Students() {
  const { user }   = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data: assessments } = await supabase.from('assessments').select('id').eq('created_by', user.id);
    if (!assessments?.length) { setStudents([]); setLoading(false); return; }

    const assessmentIds = assessments.map(a => a.id);

    const [{ data: enrollments }, { data: subs }] = await Promise.all([
      supabase.from('assessment_students')
        .select('student_id, assessments(title), profiles(id, full_name, email)')
        .in('assessment_id', assessmentIds),
      supabase.from('submissions')
        .select('student_id, status, answers(marks_awarded, questions(marks))')
        .in('assessment_id', assessmentIds),
    ]);

    const subStats = {};
    (subs ?? []).forEach(s => {
      if (!subStats[s.student_id]) subStats[s.student_id] = { count: 0, scores: [] };
      subStats[s.student_id].count++;
      if (s.status === 'Graded') {
        const maxM  = s.answers?.reduce((sum, a) => sum + (a.questions?.marks ?? 0), 0) ?? 0;
        const award = s.answers?.reduce((sum, a) => sum + (a.marks_awarded ?? 0), 0) ?? 0;
        if (maxM > 0) subStats[s.student_id].scores.push(Math.round((award / maxM) * 100));
      }
    });

    const map = {};
    (enrollments ?? []).forEach(e => {
      const pid = e.profiles?.id;
      if (!pid) return;
      if (!map[pid]) map[pid] = { id: pid, name: e.profiles.full_name || e.profiles.email || 'Unknown', email: e.profiles.email ?? '', assessments: [] };
      if (e.assessments?.title) map[pid].assessments.push(e.assessments.title);
    });

    setStudents(Object.values(map).map(s => {
      const st  = subStats[s.id] ?? { count: 0, scores: [] };
      const avg = st.scores.length ? Math.round(st.scores.reduce((a, b) => a + b) / st.scores.length) : null;
      return { ...s, subCount: st.count, avg };
    }));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">Students</div>
          <div className="text-xs text-gray-400">{loading ? 'Loading…' : `${students.length} enrolled`}</div>
        </div>
        <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-gray-300" />
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="text-3xl mb-3">👥</div>
            <p className="text-sm font-medium text-gray-700">No students found</p>
            <p className="text-xs text-gray-400 mt-1">Students appear here when they join your assessments.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Student', 'Email', 'Assessments', 'Submissions', 'Avg Score'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => setSelected(s)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(s.name)}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{s.email}</td>
                    <td className="px-5 py-3 text-gray-700">{s.assessments.length}</td>
                    <td className="px-5 py-3 text-gray-700">{s.subCount}</td>
                    <td className="px-5 py-3">
                      {s.avg !== null
                        ? <span className="text-sm font-bold text-gray-900">{s.avg}%</span>
                        : <span className="text-xs text-gray-400">No grades</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentModal student={selected} onClose={() => setSelected(null)} />
    </div>
  );
}