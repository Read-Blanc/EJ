import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
function avatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

export default function Students() {
  const { user }   = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    // Get all assessments created by this lecturer
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id')
      .eq('created_by', user.id);

    if (!assessments?.length) { setStudents([]); setLoading(false); return; }

    const assessmentIds = assessments.map(a => a.id);

    // Get all students enrolled in those assessments
    const { data: enrollments } = await supabase
      .from('assessment_students')
      .select('student_id, assessments(title), profiles(id, full_name, email)')
      .in('assessment_id', assessmentIds);

    if (!enrollments) { setStudents([]); setLoading(false); return; }

    // Deduplicate by student id and aggregate their assessments
    const map = {};
    enrollments.forEach(e => {
      const pid = e.profiles?.id;
      if (!pid) return;
      if (!map[pid]) {
        map[pid] = {
          id:          pid,
          name:        e.profiles.full_name || e.profiles.email || 'Unknown',
          email:       e.profiles.email ?? '',
          assessments: [],
        };
      }
      if (e.assessments?.title) map[pid].assessments.push(e.assessments.title);
    });

    setStudents(Object.values(map));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = students.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[18px] font-bold text-gray-900">Students</div>
          <div className="text-xs text-gray-400">{loading ? 'Loading…' : `${students.length} enrolled`}</div>
        </div>
        <input
          type="text" placeholder="Search by name or email…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="mx-6 my-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Student', 'Email', 'Enrolled Assessments'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">Loading students…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                {search ? 'No students match your search.' : 'No students enrolled yet.'}
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ background: avatarColor(s.name) }}>
                      {initials(s.name)}
                    </div>
                    <span className="font-medium text-gray-800">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {s.assessments.length === 0 ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : s.assessments.map((title, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">{title}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}