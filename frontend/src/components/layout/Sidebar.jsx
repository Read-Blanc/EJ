import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

// SVG icons — keeps the UI clean without any emoji or external deps
const Icons = {
  Dashboard:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Assessments:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Grading:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Questions:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Students:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Analytics:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Results:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Performance:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Settings:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Logout:        () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const LECTURER_NAV = [
  { to: "/lecturer",             label: "Dashboard",     icon: "Dashboard"   },
  { to: "/lecturer/assessments", label: "Assessments",   icon: "Assessments" },
  { to: "/lecturer/grading",     label: "Grading Queue", icon: "Grading"     },
  { to: "/lecturer/questions",   label: "Question Bank", icon: "Questions"   },
  { to: "/lecturer/students",    label: "Students",      icon: "Students"    },
  { to: "/lecturer/analytics",   label: "Analytics",     icon: "Analytics"   },
];

const STUDENT_NAV = [
  { to: "/student",              label: "Dashboard",   icon: "Dashboard"   },
  { to: "/student/assessments",  label: "Assessments", icon: "Assessments" },
  { to: "/student/results",      label: "My Results",  icon: "Results"     },
  { to: "/student/performance",  label: "Performance", icon: "Performance" },
];

function getInitials(fullName, email) {
  if (fullName && fullName.trim()) {
    return fullName.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  return (email || 'U').slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const navItems   = user?.role === "student" ? STUDENT_NAV : LECTURER_NAV;
  const initials   = getInitials(user?.fullName, user?.email);
  const displayRole = user?.role === "student" ? "Student" : "Lecturer";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <aside className="w-[250px] min-h-screen bg-white border-r border-gray-200 flex flex-col p-5 fixed top-0 left-0 bottom-0 z-10 overflow-y-auto">
      {/* Logo — gray-950 to match buttons throughout the app */}
      <div className="mb-8">
        <div className="text-white text-[17px] font-bold py-2.5 px-3 bg-gray-950 rounded-lg text-center tracking-wide select-none">
          EvalAI
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = Icons[item.icon];
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/lecturer" || item.to === "/student"}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                      isActive
                        ? "bg-gray-950 text-white font-semibold"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? "text-white" : "text-gray-400"}>
                        {Icon && <Icon />}
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        {user?.role === "lecturer" && (
          <div className="mb-2">
            <NavLink
              to="/lecturer/settings"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-gray-950 text-white font-semibold"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-white" : "text-gray-400"}>
                    <Icons.Settings />
                  </span>
                  Settings
                </>
              )}
            </NavLink>
          </div>
        )}

        {/* User strip */}
        <div className="flex items-center gap-3 px-1 py-2">
          {/* Avatar — consistent gray-950, no gradient */}
          <div className="w-9 h-9 rounded-full bg-gray-950 text-white flex items-center justify-center font-semibold text-xs shrink-0 select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
              {user?.fullName || user?.email || "Guest"}
            </p>
            <p className="text-xs text-gray-400 leading-tight">{displayRole}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Icons.Logout />
          Log Out
        </button>
      </div>
    </aside>
  );
}