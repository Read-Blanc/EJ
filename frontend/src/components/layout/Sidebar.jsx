import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const LECTURER_NAV = [
  { to: "/lecturer", label: "Dashboard" },
  { to: "/lecturer/assessments", label: "Assessments" },
  { to: "/lecturer/grading", label: "Grading Queue" },
  { to: "/lecturer/questions", label: "Question Bank" },
  { to: "/lecturer/students", label: "Students" },
  { to: "/lecturer/analytics", label: "Analytics" },
];

const STUDENT_NAV = [
  { to: "/student", label: "Dashboard" },
  { to: "/student/assessments", label: "Assessments" },
  { to: "/student/results", label: "My Results" },
  { to: "/student/performance", label: "Performance" },
];

function getInitials(user) {
  if (user?.fullName) {
    const parts = user.fullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (user?.email ?? "U").slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const navItems = user?.role === "student" ? STUDENT_NAV : LECTURER_NAV;
  const initials = getInitials(user);
  const displayRole = user?.role === "student" ? "Student" : "Lecturer";
  const displayName = user?.fullName || user?.email || "Guest";


  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <aside className="w-[250px] min-h-screen bg-white border-r border-gray-200 flex flex-col p-5 fixed top-0 left-0 bottom-0 z-10 overflow-y-auto">
      {/* Logo */}
      <div className="mb-8">
        <div className="text-white text-[18px] font-bold py-2.5 px-3 bg-gray-950 rounded-lg text-center tracking-wide">
          EvalAI
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/lecturer" || item.to === "/student"}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-md text-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-gray-900 text-white font-semibold"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4">
        {/* Settings — shared route for both lecturer and student */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `text-sm transition-colors ${
                isActive
                  ? "text-gray-900 font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`
            }
          >
            Settings
          </NavLink>
        </div>

        {/* User strip */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-gray-950 text-white flex items-center justify-center font-semibold text-sm shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-400">{displayRole}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}
