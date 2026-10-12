import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type NavbarProps = {
  isDark: boolean;
  onToggleTheme: () => void;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "nav-link nav-link-active" : "nav-link";

function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  const { account, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="brand" aria-label="Signify homepage">
        <img src="/logo-mark.svg" alt="" className="brand-logo" width="28" height="28" />
        Signify
      </Link>
      <div className="nav-links">
        <NavLink to="/" end className={linkClass}>Home</NavLink>
        {account ? (
          <>
            <NavLink to="/my-applications" className={linkClass}>My Applications</NavLink>
            {account.role === "admin" && <NavLink to="/admin" className={linkClass}>Admin Panel</NavLink>}
            <button type="button" className="nav-button" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>Log in</NavLink>
            <NavLink to="/register" className={linkClass}>Register</NavLink>
          </>
        )}
        <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle color theme">
          {isDark ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
