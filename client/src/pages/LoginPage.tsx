import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authSchema } from "../schemas/auth.schema";
import PasswordInput from "../components/PasswordInput";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => searchParams.get("message") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(validation.data.email, validation.data.password);
      const returnTo = searchParams.get("returnTo");
      navigate(returnTo?.startsWith("/") ? returnTo : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log you in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <h1 className="page-title">Log in</h1>
        <p className="page-subtitle">Log in to apply and view your applications.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="login-password">Password</label>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="auth-switch">
          New here? <Link to={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
