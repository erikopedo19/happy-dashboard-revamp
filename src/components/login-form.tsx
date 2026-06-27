import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { triggerGlimm } from "@/components/GlimmIntercept";

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword } = useAuth();

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
          : "/admin";
      triggerGlimm({ sweepMs: 800, outroMs: 420 });
      setTimeout(() => navigate(dest, { replace: true }), 320);
    }
  }, [user, navigate, next]);

  const canSubmit =
    mode === "signin"
      ? email.trim().length > 3 && password.length > 0
      : email.trim().length > 3 && password.length >= 6 && fullName.trim().length > 1;

  const switchMode = (m: "signin" | "signup") => {
    if (m === mode) return;
    triggerGlimm({ sweepMs: 650, outroMs: 360 });
    setMode(m);
  };

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
        const { error } = await signUp(email.trim(), password, fullName.trim(), "barber");
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Account created", description: "Check your email to verify." });
        switchMode("signin");
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

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen w-full bg-[#f5f5f7] dark:bg-[#0a0a0c] text-foreground">
      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-[460px] items-center justify-between px-5 pt-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-sm ring-1 ring-black/5 dark:ring-white/10 backdrop-blur transition hover:text-foreground"
          data-glimm-skip
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <img src="/cutzioo-logo.webp" alt="" className="h-7 w-7 rounded-[10px]" />
          <span className="font-cal text-lg tracking-tight">Cutzioo</span>
        </div>
        <button
          onClick={() => switchMode(isSignup ? "signin" : "signup")}
          className="rounded-full bg-white/80 dark:bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm ring-1 ring-black/5 dark:ring-white/10 backdrop-blur transition hover:text-foreground"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <div className="rounded-[32px] bg-white dark:bg-[#141418] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/[0.06]">
            <div className="px-7 pb-8 pt-9 sm:px-9">
              {/* Mode segmented control */}
              <div className="mb-7 flex justify-center">
                <div className="relative inline-flex rounded-full bg-black/[0.05] dark:bg-white/[0.06] p-1 text-[13px] font-medium">
                  {(["signin", "signup"] as const).map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={`relative z-10 rounded-full px-5 py-1.5 transition ${
                          active
                            ? "text-white dark:text-black"
                            : "text-foreground/60 hover:text-foreground"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="auth-pill"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }}
                            className="absolute inset-0 -z-10 rounded-full bg-[#0a0a0c] dark:bg-white"
                          />
                        )}
                        {m === "signin" ? "Sign in" : "Sign up"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className="text-center"
                >
                  <h1 className="font-cal text-[30px] leading-tight tracking-tight">
                    {isSignup ? "Create account" : "Welcome back"}
                  </h1>
                  <p className="mt-1.5 text-[14px] text-foreground/55">
                    {isSignup ? "Book your first cut in seconds." : "Sign in to continue to Cutzioo."}
                  </p>
                </motion.div>
              </AnimatePresence>

              <form onSubmit={submit} className="mt-7 space-y-3">
                <AnimatePresence initial={false}>
                  {isSignup && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <AppleField
                        label="Full name"
                        value={fullName}
                        onChange={setFullName}
                        autoComplete="name"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AppleField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />

                <AppleField
                  label="Password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="text-foreground/40 transition hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                {!isSignup && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={onForgot}
                      disabled={resetting}
                      className="text-[12px] font-medium text-[#0A84FF] transition hover:opacity-80"
                    >
                      {resetting ? "Sending..." : "Forgot password?"}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="group mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0c] text-[15px] font-semibold text-white shadow-[0_10px_25px_-10px_rgba(10,10,12,0.6)] transition hover:scale-[0.99] active:scale-[0.985] disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isSignup ? "Create account" : "Sign in"}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-foreground/45">
                By continuing you agree to our{" "}
                <a className="underline-offset-2 hover:underline" href="#" data-glimm-skip>Terms</a> and{" "}
                <a className="underline-offset-2 hover:underline" href="#" data-glimm-skip>Privacy</a>.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function AppleField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  trailing?: React.ReactNode;
}) {
  const filled = value.length > 0;
  return (
    <label className="group relative block">
      <div className="relative flex h-14 items-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] px-4 ring-1 ring-transparent transition focus-within:bg-white dark:focus-within:bg-white/[0.08] focus-within:ring-[#0A84FF]/40 focus-within:shadow-[0_0_0_4px_rgba(10,132,255,0.12)]">
        <span
          className={`pointer-events-none absolute left-4 origin-left text-foreground/50 transition-all duration-200 ${
            filled
              ? "top-1.5 text-[11px] font-medium"
              : "top-1/2 -translate-y-1/2 text-[14px]"
          } group-focus-within:top-1.5 group-focus-within:-translate-y-0 group-focus-within:text-[11px] group-focus-within:font-medium group-focus-within:text-[#0A84FF]`}
        >
          {label}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="peer h-full w-full bg-transparent pt-4 text-[15px] text-foreground outline-none placeholder:text-transparent"
        />
        {trailing && <div className="ml-2 flex items-center">{trailing}</div>}
      </div>
    </label>
  );
}
