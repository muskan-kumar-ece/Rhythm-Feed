import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  email: string | null;
  isArtist: boolean;
};

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated" };

type AuthCtx = {
  state: AuthState;
  login:   (username: string, password: string) => Promise<void>;
  signup:  (username: string, email: string, password: string, displayName: string) => Promise<void>;
  logout:  () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "Request failed");
  return body;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const user = await apiFetch("/api/auth/me");
      setState({ status: "authenticated", user });
    } catch {
      setState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setState({ status: "authenticated", user });
  }, []);

  const signup = useCallback(async (
    username: string, email: string, password: string, displayName: string
  ) => {
    const user = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password, displayName }),
    });
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setState({ status: "unauthenticated" });
  }, []);

  return (
    <Ctx.Provider value={{ state, login, signup, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
