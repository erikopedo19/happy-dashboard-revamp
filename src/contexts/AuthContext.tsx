import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: "barber" | "client"
  ) => Promise<{ error: any }>;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const maybeSendWelcome = async (uid: string) => {
      const key = `cutzio:welcome-sent:${uid}`;
      if (localStorage.getItem(key)) return;
      try {
        await supabase.functions.invoke("send-welcome-premium");
        localStorage.setItem(key, "1");
        window.dispatchEvent(new Event("premium:refresh"));
      } catch (e) {
        console.warn("welcome email invoke failed", e);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setTimeout(() => maybeSendWelcome(session.user.id), 0);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error getting session:", error);
      }
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setLoading(false);
      if (data?.session?.user) {
        setTimeout(() => maybeSendWelcome(data.session!.user.id), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "barber" | "client" = "client"
  ) => {
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    return { error };
  };

  const signIn = async (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("rememberEmail", email);
    } else if (!error) {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberEmail");
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    return { error };
  };

  const signInWithGoogle = async () => {
    // Preserve the ?next= param across the OAuth round-trip by sending the
    // user back to /auth, where LoginForm's effect will forward them to `next`.
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/";
    const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    return { error };
  };

  const signOut = async () => {
    try { localStorage.removeItem("cutzio:mode-choice"); } catch {}
    await supabase.auth.signOut();
  };

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    resetPassword,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
