import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentAccount,
  loginAccount,
  registerAccount,
  type AuthAccount,
} from "../api/api";

const TOKEN_KEY = "volunteer_portal_token";

type AuthContextValue = {
  account: AuthAccount | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    getCurrentAccount()
      .then(setAccount)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setAccount(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function authenticate(authRequest: () => Promise<{ token: string; account: AuthAccount }>) {
    const result = await authRequest();
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setAccount(result.account);
  }

  async function login(email: string, password: string) {
    await authenticate(() => loginAccount(email, password));
  }

  async function register(email: string, password: string) {
    await authenticate(() => registerAccount(email, password));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAccount(null);
  }

  return (
    <AuthContext.Provider value={{ account, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an <AuthProvider>");
  return context;
}
