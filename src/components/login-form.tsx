import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Simple, modern auth screen.
 * Single column, soft surfaces, no role pickers, no clutter.
 */
export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role;
      const dest =
        next && next !== "/"
          ? next
          : role === "client"
          ? "/find-barber"
          : role === "barber"
          ? "/admin"
          : "/choose-role";
      navigate(dest, { replace: true });
    }
  }, [user, navigate, next]);

  const canSubmit =
    mode === "signin"
      ? email.trim().length > 3 && password.length > 0
      : email.trim().length > 3 && password.length >= 6 && fullName.trim().length > 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
          return;
        }
      } else {
        const { error } = await signUp(email.trim(), password, fullName.trim(), "client");
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Account created", description: "Check your email to verify." });
        setMode("signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (!email.trim()) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    setResetting(true);
    const { error } = await resetPassword(email.trim());
    setResetting(false);
    if (error) toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    else toast({ title: "Reset email sent", description: "Check your inbox." });
  };

  const onGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-5 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
        >
          <img src="/logo.svg" alt="Cutzio" className="h-6 w-6 brightness-0 invert" />
          <span className="font-semibold">Cutzio</span>
        </button>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-white/60 hover:text-white transition"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-5">
              <img
                src="/cutzioo-logo.webp"
                alt="Cutzio"
                className="h-16 w-16 rounded-2xl object-contain"
              />
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {mode === "signin"
                ? "Sign in to continue."
                : "It only takes a few seconds."}
            </p>
          </div>

          <button
            type="button"
            onClick={onGoogle}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-white text-black font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-white/90 transition active:scale-[0.99] disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 7 29.4 5 24 5 16.3 5 9.6 9.1 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.7 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C40.7 36.2 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                placeholder="Full name"
                value={fullName}
                onChange={setFullName}
                type="text"
                autoComplete="name"
              />
            )}
            <Field
              icon={<Mail className="h-4 w-4" />}
              placeholder="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <div className="relative">
              <Field
                icon={<Lock className="h-4 w-4" />}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                type={showPwd ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onForgot}
                  disabled={resetting}
                  className="text-xs text-white/55 hover:text-white transition"
                >
                  {resetting ? "Sending..." : "Forgot password?"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className={cn(
                "mt-2 w-full h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.99]",
                "bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-white/35 leading-relaxed">
            By continuing you agree to our{" "}
            <a className="underline-offset-2 hover:underline" href="#">Terms</a> and{" "}
            <a className="underline-offset-2 hover:underline" href="#">Privacy Policy</a>.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  type,
  autoComplete,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:bg-white/[0.06] focus:border-white/25"
      />
    </div>
  );
}
