import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          {/* Spinner — gray-950, consistent with the rest of the app */}
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-950 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath =
      user?.role === "student" ? "/student" : "/lecturer";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;