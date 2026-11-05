import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchAuthMe } from "../lib/authApi";

const TOKEN_KEY = "solarvy_user_token";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phoneE164: string;
  authProvider: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(readStoredToken()));

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } catch {
      // ignore
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = readStoredToken();
    if (!current) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchAuthMe();
      if (data.success && data.data) {
        setToken(current);
        setUser(data.data);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    void refreshUser();
  }, [token, refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      setSession,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, setSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
