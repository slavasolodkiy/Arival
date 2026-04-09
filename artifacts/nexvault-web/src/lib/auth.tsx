import React, { createContext, useContext, useState } from "react";
import { useLocation } from "wouter";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
setBaseUrl(API_BASE || null);

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("accessToken"));
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    const stored = localStorage.getItem("accessToken");
    if (stored) setAuthTokenGetter(() => stored);
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("accessToken", newToken);
      setAuthTokenGetter(() => newToken);
    } else {
      localStorage.removeItem("accessToken");
      setAuthTokenGetter(null);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
