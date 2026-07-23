/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface UserSession {
  email: string;
  name: string;
  roles: string[];
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  hasAccess: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>({
    email: "pa1@skillizee.io",
    name: "Primary Admin",
    roles: ["linkedin", "social_media", "podcast", "admin"],
    isAdmin: true
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string): Promise<UserSession> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Login failed");
    }

    const data = await res.json();
    if (data.success && data.user) {
      setUser(data.user);
      localStorage.setItem("skilizee_user", JSON.stringify(data.user));
      localStorage.setItem("skilizee_sso", btoa(`${email}:${password}`));
      return data.user;
    } else {
      throw new Error("Invalid response from login server");
    }
  };

  useEffect(() => {
    const handleSSOAndLoad = async () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const ssoToken = params.get("sso");
        if (ssoToken) {
          try {
            const decoded = atob(ssoToken);
            const [email, password] = decoded.split(":");
            if (email && password) {
              await login(email, password);
              const cleanUrl = window.location.pathname + window.location.search.replace(/[\?&]sso=[^&]+/, "").replace(/^&/, "?");
              window.history.replaceState({}, document.title, cleanUrl);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("SSO authentication failed:", e);
          }
        }
      }

      const savedUser = localStorage.getItem("skilizee_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Error parsing saved user session:", e);
          localStorage.removeItem("skilizee_user");
        }
      }
      setLoading(false);
    };

    handleSSOAndLoad();
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("skilizee_user");
    localStorage.removeItem("skilizee_sso");
    if (typeof window !== "undefined") {
      const commonHomeUrl = process.env.NEXT_PUBLIC_SOCIAL_MEDIA_URL || "https://social-media-tool-three.vercel.app";
      window.location.href = `${commonHomeUrl}/?login=true`;
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      // Re-fetch users list to sync role updates
      const res = await fetch("/api/admin/users", {
        headers: {
          "x-admin-email": user.email,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const me = data.users.find((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
        if (me) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, ...safeMe } = me;
          setUser(safeMe);
          localStorage.setItem("skilizee_user", JSON.stringify(safeMe));
        }
      }
    } catch (err) {
      console.error("Error refreshing user session:", err);
    }
  };

  const hasAccess = user ? (user.roles.includes("podcast") || user.isAdmin) : false;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasAccess, refreshUser }}>
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
