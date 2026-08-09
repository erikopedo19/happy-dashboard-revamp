import checkLogo from "@/assets/cutzioo-check.png.asset.json";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Chrome } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { triggerGlimm } from "@/components/GlimmIntercept";

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Resolve once on mount so an async auth re-render can't lose the target.
  const [next] = useState(() => {
    const fromQuery = searchParams.get("next");
    if (fromQuery) return fromQuery;
    try {
      const saved = sessionStorage.getItem("auth:next");
      if (saved) {
        sessionStorage.removeItem("auth:next");
        return saved;
      }
    } catch { /* ignore */ }
    return "/";
  });
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"barber" | "client">("barber");

  useEffect(() => {
    if (user) {
      let remembered: string | null = null;
      try { remembered = localStorage.getItem("cutzio:mode-choice"); } catch {}
      let dest: string;
      if (remembered === "client" || remembered === "barber") {
        dest =
          next && next !== "/"
            ? next
            : remembered === "client"
            ? "/find-barber"
            : "/admin";
      } else {
        const params = new URLSearchParams();
        if (next && next !== "/") params.set("next", next);
        const qs = params.toString();
        dest = `/choose-mode${qs ? `?${qs}` : ""}`;
      }
      triggerGlimm({ sweepMs: 800, outroMs: 420 });
      setTimeout(() => navigate(dest, { replace: true }), 320);
    }
  }, [user, navigate, next]);

  const canSubmit =
    mode === "signin"
      ? email.trim().length > 3 && password.length > 0
      : email.trim().length > 3 && password.length >= 6 && fullName.trim().length > 1 && agreedToPolicy;

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
        const { error } = await signUp(email.trim(), password, fullName.trim(), role);
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Account created", description: "Check your email to verify." });
        switchMode("signin");
      }
    } catch (err: any) {
      toast({ title: "Something went wrong", description: err?.message || "Please try again.", variant: "destructive" });
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
    try {
      const { error } = await resetPassword(email.trim());
      if (error) toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      else toast({ title: "Reset email sent", description: "Check your inbox." });
    } catch (err: any) {
      toast({ title: "Something went wrong", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const googleSignIn = async () => {
    setGoogleBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleBusy(false);
      toast({ title: "Google sign in failed", description: error.message, variant: "destructive" });
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen w-full bg-[#0A0A0C] text-foreground">
      {/* iOS-style header */}
      <header className="relative z-10 mx-auto flex w-full max-w-[460px] items-center justify-between px-5 pt-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-white/90 dark:bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition hover:text-foreground"
          data-glimm-skip
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <img src={checkLogo.url} alt="" className="h-7 w-7 rounded-[12px] object-contain" />
          <span className="font-cal text-lg tracking-tight">Cutzioo</span>
        </div>
        <div className="w-16" />
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <div className="rounded-[20px] bg-white dark:bg-[#141418] shadow-[0_20px_60px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:ring-white/[0.06]">
            <div className="px-6 pb-8 pt-8 sm:px-8">

              <div className="text-center">
                <h1 className="font-cal text-[28px] leading-tight tracking-tight">
                  {isSignup ? "Create account" : "Welcome back"}
                </h1>
                <p className="mt-1.5 text-[14px] text-foreground/55">
                  {isSignup ? "Book your first cut in seconds." : "Sign in to continue to Cutzioo."}
                </p>
              </div>

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

                {isSignup && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <label className="block text-[13px] font-medium text-foreground/70 mb-2">I want to join as</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("barber")}
                        className={`relative h-12 rounded-[12px] border-2 transition-all ${
                          role === "barber"
                            ? "border-[#0A84FF] bg-[#0A84FF]/10"
                            : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/20 dark:hover:border-white/20"
                        }`}
                      >
                        <span className={`text-[14px] font-medium ${role === "barber" ? "text-[#0A84FF]" : "text-foreground/70"}`}>
                          Barber
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("client")}
                        className={`relative h-12 rounded-[12px] border-2 transition-all ${
                          role === "client"
                            ? "border-[#0A84FF] bg-[#0A84FF]/10"
                            : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/20 dark:hover:border-white/20"
                        }`}
                      >
                        <span className={`text-[14px] font-medium ${role === "client" ? "text-[#0A84FF]" : "text-foreground/70"}`}>
                          Client
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}

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
                {isSignup && (
                  <label className="flex items-start gap-2.5 pt-1 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToPolicy}
                      onChange={(e) => setAgreedToPolicy(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-black/20 dark:border-white/20 accent-[#0A84FF]"
                    />
                    <span className="text-[12px] leading-relaxed text-foreground/60">
                      I agree to the{" "}
                      <a href="/terms" target="_blank" className="underline underline-offset-2 text-foreground/80">Terms</a> and{" "}
                      <a href="/privacy" target="_blank" className="underline underline-offset-2 text-foreground/80">Privacy Policy</a>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="group mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0c] text-[15px] font-semibold text-white shadow-[0_10px_25px_-10px_rgba(10,10,12,0.6)] transition hover:scale-[0.99] active:scale-[0.985] disabled:opacity-50 dark:bg-white dark:text-black"
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

                <div className="relative mt-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-foreground/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-[#141418] px-2 text-foreground/40">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={googleSignIn}
                  disabled={googleBusy}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-black/10 bg-white px-4 text-[15px] font-semibold text-[#0a0a0c] shadow-sm transition hover:scale-[0.99] active:scale-[0.985] disabled:opacity-50"
                >
                  {googleBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
              </form>

              {/* Sign up toggle below login */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => switchMode(isSignup ? "signin" : "signup")}
                  className="text-[14px] text-[#0A84FF] font-medium transition hover:opacity-80"
                >
                  {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-foreground/45">
                By continuing you agree to our{" "}
                <a className="underline-offset-2 hover:underline" href="/terms" data-glimm-skip>Terms</a> and{" "}
                <a className="underline-offset-2 hover:underline" href="/privacy" data-glimm-skip>Privacy</a>.
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
      <div className="relative flex h-14 items-center rounded-[12px] bg-black/[0.04] dark:bg-white/[0.05] px-4 ring-1 ring-transparent transition focus-within:bg-white dark:focus-within:bg-white/[0.08] focus-within:ring-[#0A84FF]/40 focus-within:shadow-[0_0_0_4px_rgba(10,132,255,0.12)]">
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
