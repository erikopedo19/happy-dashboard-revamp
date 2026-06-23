import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-6 w-6 rounded-md" />
          <span className="font-semibold">Cutzioo</span>
        </button>
        <Button variant="ghost" size="sm" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Sign up" : "Sign in"}
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-14 w-14 rounded-xl" />
              </div>
              <CardTitle className="text-2xl">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "signin" ? "Sign in to continue." : "It only takes a few seconds."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={onForgot}
                        disabled={resetting}
                        className="text-xs text-muted-foreground hover:text-foreground transition"
                      >
                        {resetting ? "Sending..." : "Forgot password?"}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      className="pl-9 pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "signin" ? "Sign in" : "Create account"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                By continuing you agree to our{" "}
                <a className="underline-offset-2 hover:underline" href="#">Terms</a> and{" "}
                <a className="underline-offset-2 hover:underline" href="#">Privacy Policy</a>.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
