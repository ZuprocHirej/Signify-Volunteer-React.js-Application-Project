import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RequireAuth() {
  const { account, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <p className="page loading-message">Loading account...</p>;
  if (!account) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}

export default RequireAuth;
