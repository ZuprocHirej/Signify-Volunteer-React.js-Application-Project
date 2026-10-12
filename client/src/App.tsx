import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SignUpPage from "./pages/SignUpPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import AdminPage from "./pages/AdminPage";
import RequireAdmin from "./components/RequireAdmin";

const PAGE_TITLES: Record<string, string> = {
  "/": "Signify | Community in Action",
  "/login": "Log In — Signify",
  "/register": "Register — Signify",
  "/signup": "Apply to Volunteer — Signify",
  "/my-applications": "My Applications — Signify",
  "/admin": "Admin Dashboard — Signify",
};

function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const isSignup = location.pathname.startsWith("/signup");
    const isOpportunity = location.pathname.startsWith("/opportunities");
    document.title = isSignup
      ? "Apply to Volunteer — Signify"
      : isOpportunity
      ? "Opportunity Details — Signify"
      : PAGE_TITLES[location.pathname] || "Signify | Community in Action";
  }, [location.pathname]);

  return null;
}

function PageBackground() {
  const location = useLocation();
  const path = location.pathname;

  let bgClass = "";
  if (path === "/" || path.startsWith("/opportunities")) bgClass = "home-bg";
  else if (path.startsWith("/signup")) bgClass = "wizard-bg";
  else if (path === "/my-applications") bgClass = "applications-bg";
  else if (path === "/admin") bgClass = "admin-bg";

  if (!bgClass) return null;

  return <div className={`page-bg-photo ${bgClass}`} aria-hidden="true" />;
}

function App() {
  const [isDark, setIsDark] = useState(false);

  return (
    <AppProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <PageTitleUpdater />
        <AuthProvider>
          <div className={isDark ? "app-shell dark" : "app-shell"}>
            <PageBackground />
            <Navbar isDark={isDark} onToggleTheme={() => setIsDark((prev) => !prev)} />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/signup/:opportunityId" element={<SignUpPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/my-applications" element={<MyApplicationsPage />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
