import React, { createContext, useContext, useEffect, useState } from "react";
import { store } from "./storage";

export type UserRole = "admin" | "viewer" | string | null;

interface AuthContextValue {
  token: string | null;
  role: UserRole;
  username: string | null;
  ready: boolean;
  signIn: (token: string, role?: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  role: null,
  username: null,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      store.get("token"),
      store.get("role"),
      store.get("username"),
    ]).then(([t, r, u]) => {
      setToken(t);
      setRole(r);
      setUsername(u);
      setReady(true);
    });
  }, []);

  const signIn = async (t: string, r?: string, u?: string) => {
    await store.set("token", t);
    setToken(t);
    if (r) {
      await store.set("role", r);
      setRole(r);
    }
    if (u) {
      await store.set("username", u);
      setUsername(u);
    }
  };

  const signOut = async () => {
    await Promise.all([
      store.del("token"),
      store.del("role"),
      store.del("username"),
    ]);
    setToken(null);
    setRole(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, username, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
