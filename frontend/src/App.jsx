import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { supabase } from "./supabaseClient";

// Layout
import Sidebar from "./components/layout/Sidebar";
import SplashScreen from "./components/ui/SplashScreen";

// Public pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import OAuth from "./pages/auth/OAuth";

// Lecturer pages
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import LecturerAssessments from "./pages/lecturer/LecturerAssessments";
import CreateEditAssessment from "./pages/lecturer/CreateEditAssessment";
import AssessmentDetail from "./pages/lecturer/AssessmentDetail";
import Grading from "./pages/lecturer/Grading";
import GradingDetail from "./pages/lecturer/GradingDetail";
import QuestionBank from "./pages/lecturer/QuestionBank";
import CreateEditQuestion from "./pages/lecturer/CreateEditQuestion";
import Students from "./pages/lecturer/Students";
import LecturerAnalytics from "./pages/lecturer/Analytics";
import Settings from "./pages/Settings";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import AvailableAssessments from "./pages/student/AvailableAssessments";
import TakeAssessments from "./pages/student/TakeAssessments";
import Results from "./pages/student/Results";
import ResultDetail from "./pages/student/ResultDetail";
import StudentPerformance from "./pages/student/StudentPerformance";

// ── Protected layout wrapper ──────────────────────────────────────────────────
// Renders the sidebar shell; redirects to /login if unauthenticated,
// or to the role home if the user's role doesn't match the required one.
function ProtectedLayout({ requiredRole }) {
  const { user } = AuthContext._currentValue ?? {};
  // We read from context inside a component, so use the hook pattern via Outlet context
  return <ProtectedLayoutInner requiredRole={requiredRole} />;
}

import { useContext } from "react";

function ProtectedLayoutInner({ requiredRole }) {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Navigate
        to={user.role === "lecturer" ? "/lecturer" : "/student"}
        replace
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="ml-[250px] flex-1 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  // Rehydrate session on mount + subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateUser(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) hydrateUser(session);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hydrateUser = async (session) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", session.user.id)
      .single();

    const role = profile?.role ?? session.user.user_metadata?.role;
    const fullName =
      profile?.full_name ?? session.user.user_metadata?.full_name ?? "";

    if (role) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        fullName,
        role,
        isAuthenticated: true,
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {!showSplash && (
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<OAuth />} />

            {/* Lecturer */}
            <Route element={<ProtectedLayoutInner requiredRole="lecturer" />}>
              <Route path="/lecturer" element={<LecturerDashboard />} />
              <Route
                path="/lecturer/assessments"
                element={<LecturerAssessments />}
              />
              <Route
                path="/lecturer/assessments/new"
                element={<CreateEditAssessment />}
              />
              <Route
                path="/lecturer/assessments/:id"
                element={<AssessmentDetail />}
              />
              <Route
                path="/lecturer/assessments/:id/edit"
                element={<CreateEditAssessment />}
              />
              <Route path="/lecturer/grading" element={<Grading />} />
              <Route path="/lecturer/grading/:id" element={<GradingDetail />} />
              <Route path="/lecturer/questions" element={<QuestionBank />} />
              <Route
                path="/lecturer/questions/new"
                element={<CreateEditQuestion />}
              />
              <Route
                path="/lecturer/questions/:id/edit"
                element={<CreateEditQuestion />}
              />
              <Route path="/lecturer/students" element={<Students />} />
              <Route
                path="/lecturer/analytics"
                element={<LecturerAnalytics />}
              />
              <Route path="/lecturer/settings" element={<Settings />} />
            </Route>

            {/* Student */}
            <Route element={<ProtectedLayoutInner requiredRole="student" />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route
                path="/student/assessments"
                element={<AvailableAssessments />}
              />
              <Route path="/student/take/:id" element={<TakeAssessments />} />
              <Route path="/student/results" element={<Results />} />
              <Route path="/student/results/:id" element={<ResultDetail />} />
              <Route
                path="/student/performance"
                element={<StudentPerformance />}
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </AuthContext.Provider>
  );
}
