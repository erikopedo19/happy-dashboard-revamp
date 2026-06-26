import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      // Default everyone to barber dashboard; the dashboard offers a
      // "looking to book instead?" prompt to switch to the client side.
      const dest =
        next && next !== "/"
          ? next
          : role === "client"
          ? "/find-barber"
          : "/admin";
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

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-[#FF2D6F]/25 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 h-[560px] w-[560px] rounded-full bg-[#0A84FF]/25 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md transition hover:text-foreground"
          data-glimm-skip
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <img src="/cutzioo-logo.webp" alt="" className="h-7 w-7 rounded-lg shadow-lg shadow-black/40" />
          <span className="font-cal text-lg tracking-tight">Cutzioo</span>
        </div>
        <button
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs backdrop-blur-md transition hover:bg-white/10"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </button>
      </header>

      {/* Card */}
      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[400px]"
        >
          {/* Gradient border wrapper */}
          <div className="rounded-[28px] bg-gradient-to-br from-white/15 via-white/5 to-white/10 p-px shadow-2xl shadow-black/40">
            <div className="rounded-[27px] bg-background/70 backdrop-blur-2xl">
              <div className="px-7 pb-7 pt-9">
                {/* Mode pill */}
                <div className="mb-6 flex justify-center">
                  <div className="relative inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-medium">
                    {(["signin", "signup"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`relative z-10 rounded-full px-4 py-1.5 transition ${
                          mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode === m && (
                          <motion.span
                            layoutId="auth-pill"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#FF2D6F] to-[#0A84FF] shadow-lg shadow-[#FF2D6F]/30"
                          />
                        )}
                        {m === "signin" ? "Sign in" : "Sign up"}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <h1 className="font-cal text-[28px] leading-tight tracking-tight">
                      {isSignup ? "Create account" : "Welcome back"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isSignup ? "Book your first cut in seconds." : "Sign in to continue."}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <form onSubmit={submit} className="mt-6 space-y-3">
                  <AnimatePresence initial={false}>
                    {isSignup && (
                      <motion.div
                        key="name"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Field icon={<UserIcon className="h-4 w-4" />}>
                          <Input
                            id="name"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            autoComplete="name"
                            className="h-12 border-0 bg-transparent pl-10 text-base focus-visible:ring-0"
                            required
                          />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field icon={<Mail className="h-4 w-4" />}>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="h-12 border-0 bg-transparent pl-10 text-base focus-visible:ring-0"
                      required
                    />
                  </Field>

                  <Field icon={<Lock className="h-4 w-4" />}>
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      className="h-12 border-0 bg-transparent pl-10 pr-10 text-base focus-visible:ring-0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  {!isSignup && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onForgot}
                        disabled={resetting}
                        className="text-xs text-muted-foreground transition hover:text-foreground"
                      >
                        {resetting ? "Sending..." : "Forgot password?"}
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="group relative mt-2 h-12 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF2D6F] to-[#0A84FF] text-base font-semibold text-white shadow-lg shadow-[#FF2D6F]/30 transition hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {isSignup ? "Create account" : "Sign in"}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                  By continuing you agree to our{" "}
                  <a className="underline-offset-2 hover:underline" href="#" data-glimm-skip>Terms</a> and{" "}
                  <a className="underline-offset-2 hover:underline" href="#" data-glimm-skip>Privacy</a>.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.04] transition focus-within:border-white/25 focus-within:bg-white/[0.07]">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      {children}
    </div>
  );
}
