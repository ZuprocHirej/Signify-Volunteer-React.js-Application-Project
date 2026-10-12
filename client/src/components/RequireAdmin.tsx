import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RequireAdmin() {
  const { account, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <p className="page loading-message">Loading account...</p>;
  if (!account) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (account.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}

export default RequireAdmin;
