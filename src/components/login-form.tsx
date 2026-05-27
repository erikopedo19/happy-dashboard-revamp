import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ChevronRight,
  Scissors,
  UserCircle2,
  Sparkles,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function LoginForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showGoogleButton, setShowGoogleButton] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"client" | "barber" | null>(null);
  const [signupStep, setSignupStep] = useState<"onboarding" | "form">("onboarding");

  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
    role: "client" as "barber" | "client",
  });

  const [signUpForm, setSignUpForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "client" as "barber" | "client",
  });

  useEffect(() => {
    let mounted = true;
    supabase
      .from("app_settings" as any)
      .select("value")
      .eq("key", "auth")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const value = (data as any)?.value;
        setShowGoogleButton(value?.show_google_button !== false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role;
      if (role === "client") {
        navigate("/find-barber", { replace: true });
      } else if (role === "barber") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/choose-role", { replace: true });
      }
    }
  }, [user, navigate]);

  const canSubmitSignIn = signInForm.email.trim().length > 3 && signInForm.password.trim().length > 0;
  const canSubmitSignUp =
    signUpForm.fullName.trim().length > 1 &&
    signUpForm.email.trim().length > 3 &&
    signUpForm.password.length >= 6 &&
    signUpForm.confirmPassword.length >= 6;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitSignIn) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(signInForm.email.trim(), signInForm.password, signInForm.rememberMe);

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message || "Unable to sign in. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const existingRole = currentUser?.user_metadata?.role as string | undefined;

      if (!existingRole && currentUser) {
        await supabase.auth.updateUser({
          data: { role: signInForm.role },
        });
      }

      const redirectRole = existingRole || signInForm.role;
      if (redirectRole === "client") {
        navigate("/find-barber", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }

      toast({
        title: "Welcome back",
        description: "You signed in successfully.",
      });
    } catch (_err) {
      toast({
        title: "Sign in failed",
        description: "Unexpected error while signing in.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitSignUp) return;

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(
        signUpForm.email.trim(),
        signUpForm.password,
        signUpForm.fullName.trim(),
        signUpForm.role,
      );

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message || "Unable to create account or send confirmation email.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account created",
        description:
          signUpForm.role === "barber"
            ? "Welcome aboard. Check your email to verify your barber account."
            : "Welcome. Check your email to verify your account.",
      });

      setActiveTab("signin");
      setSignInForm((prev) => ({ ...prev, email: signUpForm.email.trim() }));
      setSignUpForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "client",
      });
      setSignupStep("onboarding");
    } catch (_err) {
      toast({
        title: "Sign up failed",
        description: "Unexpected error while creating your account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!signInForm.email.trim()) {
      toast({
        title: "Enter your email first",
        description: "Type your account email, then click Forgot password.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await resetPassword(signInForm.email.trim());

      if (error) {
        toast({
          title: "Reset email failed",
          description: error.message || "Could not send reset email.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reset email sent",
        description: "Check your inbox for the password reset link.",
      });
    } catch (_err) {
      toast({
        title: "Reset email failed",
        description: "Unexpected error while sending reset email.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google sign-in failed",
          description: error.message || "Unable to start Google sign-in.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#20242d_0%,#0b0c10_38%,#050506_100%)] p-4 text-foreground md:p-10"
    >
      <div className="relative w-full max-w-sm">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <AnimatePresence>
            {!selectedRole && (
              <motion.div
                key="role-selector"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 sm:p-8 bg-[radial-gradient(circle_at_top,#20242d_0%,#0b0c10_38%,#050506_100%)]"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/[0.08] ring-1 ring-white/15">
                  <img src="/logo.svg" alt="Cutzio" className="h-9 w-9 object-contain brightness-0 invert" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white text-center mb-2">
                  Welcome to Cutzio
                </h1>
                <p className="text-sm text-white/55 text-center mb-8 max-w-[260px]">
                  What brings you here?
                </p>

                {/* What you can do */}
                <div className="w-full space-y-2 mb-6">
                  <div className="text-[11px] text-white/40 text-center mb-3">What you can do</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { icon: "📅", label: "Book" },
                      { icon: "✂️", label: "Find barbers" },
                      { icon: "📱", label: "24/7 booking" },
                      { icon: "🔔", label: "Reminders" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/60"
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {[
                    { key: "client", label: "I need a barber", desc: "Book appointments", Icon: UserCircle2 },
                    { key: "barber", label: "I am a barber", desc: "Manage my shop", Icon: Scissors },
                  ].map(({ key, label, desc, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key === "client") {
                          navigate("/find-barber");
                        } else {
                          setSelectedRole(key as "client" | "barber");
                          setSignInForm((p) => ({ ...p, role: key as "client" | "barber" }));
                          setSignUpForm((p) => ({ ...p, role: key as "client" | "barber" }));
                        }
                      }}
                      className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left transition-all hover:bg-white/[0.09] hover:border-white/20 active:scale-[0.98]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-[11px] text-white/50">{desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedRole && (
            <button
              type="button"
              onClick={() => { setSelectedRole(null); setSignupStep("onboarding"); }}
              className="mb-4 text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
            >
              <ArrowRight className="h-3 w-3 rotate-180" /> Change role
            </button>
          )}

          <div className="flex flex-col items-center space-y-2 text-center mb-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/[0.08] ring-1 ring-white/15">
              <img src="/logo.svg" alt="Cutzio" className="h-9 w-9 object-contain brightness-0 invert" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Welcome to Cutzio
            </h1>
            <p className="text-sm text-white/55">
              Sign in to manage your barbershop flow.
            </p>
          </div>

          {showGoogleButton && (
            <>
              <Button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                variant="outline"
                className="w-full mb-4 h-11 rounded-[18px] bg-white text-[#1C1C1E] hover:bg-white/90 border-0 font-medium gap-2"
              >
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 7 29.4 5 24 5 16.3 5 9.6 9.1 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.7 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C40.7 36.2 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] uppercase tracking-wider text-white/40">or email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid h-11 w-full grid-cols-2 gap-1 rounded-full bg-white/5 p-1">
              <TabsTrigger
                value="signin"
                className="h-9 rounded-full text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
              >
                Sign in
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="h-9 rounded-full text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
              >
                Sign up
              </TabsTrigger>
            </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="pl-10 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInForm.password}
                        onChange={(e) => setSignInForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Role chooser for sign-in */}
                  <div className="space-y-2">
                    <Label>Sign in as</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { key: "client", label: "Client", desc: "Book appointments", Icon: UserCircle2 },
                          { key: "barber", label: "Barber", desc: "Manage my shop", Icon: Scissors },
                        ] as const
                      ).map(({ key, label, desc, Icon }) => {
                        const selected = signInForm.role === key;
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setSignInForm((prev) => ({ ...prev, role: key }))}
                            className={cn(
                              "relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                              selected
                                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm"
                                : "border-border hover:border-[hsl(var(--primary))]/40 hover:bg-muted/40",
                            )}
                            aria-pressed={selected}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                                selected ? "bg-[hsl(var(--primary))] text-white" : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-sm font-semibold">{label}</div>
                            <div className="text-[11px] text-muted-foreground">{desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={signInForm.rememberMe}
                        onCheckedChange={(checked) => setSignInForm((prev) => ({ ...prev, rememberMe: !!checked }))}
                        className="transition-all duration-200 hover:scale-110 active:scale-95"
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm cursor-pointer transition-colors hover:text-foreground"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={handleForgotPassword}
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? "Sending..." : "Forgot password?"}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                    disabled={isLoading || !canSubmitSignIn}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {signupStep === "onboarding" ? (
                  <div className="space-y-5 py-2">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-white">
                        {selectedRole === "barber" ? "Grow your barbershop" : "Find your perfect barber"}
                      </h3>
                      <p className="text-sm text-white/55 mt-1">
                        {selectedRole === "barber"
                          ? "Everything you need to manage bookings online."
                          : "Book appointments in seconds."}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {(selectedRole === "barber" ? [
                        { title: "Your shop online", desc: "Create a booking page clients can visit 24/7.", Icon: Scissors },
                        { title: "Accept bookings", desc: "Clients book directly into your calendar.", Icon: CalendarCheck },
                        { title: "Grow fast", desc: "Get discovered by new clients every day.", Icon: Sparkles },
                      ] : [
                        { title: "Find top barbers", desc: "Browse verified barbers near you.", Icon: UserCircle2 },
                        { title: "Book in seconds", desc: "Pick a time and confirm instantly.", Icon: CalendarCheck },
                        { title: "Never miss a cut", desc: "Get reminders before every appointment.", Icon: ShieldCheck },
                      ]).map((item, i) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                            <item.Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{item.title}</div>
                            <div className="text-xs text-white/50">{item.desc}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={() => navigate(`/onboarding?role=${selectedRole ?? "barber"}`)}
                      className="w-full rounded-full bg-white text-black hover:bg-white/90"
                    >
                      Get started
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Role chooser */}
                  <div className="space-y-2">
                    <Label>I'm signing up as</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { key: "client", label: "Client", desc: "Book appointments", Icon: UserCircle2 },
                          { key: "barber", label: "Barber", desc: "Manage my shop", Icon: Scissors },
                        ] as const
                      ).map(({ key, label, desc, Icon }) => {
                        const selected = signUpForm.role === key;
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setSignUpForm((prev) => ({ ...prev, role: key }))}
                            className={cn(
                              "relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                              selected
                                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm"
                                : "border-border hover:border-[hsl(var(--primary))]/40 hover:bg-muted/40",
                            )}
                            aria-pressed={selected}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                                selected ? "bg-[hsl(var(--primary))] text-white" : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-sm font-semibold">{label}</div>
                            <div className="text-[11px] text-muted-foreground">{desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signUpForm.fullName}
                        onChange={(e) => setSignUpForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        className="pl-10 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signUpForm.email}
                        onChange={(e) => setSignUpForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="pl-10 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                      <Input
                        id="signup-confirm"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 pr-10 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                    disabled={isLoading || !canSubmitSignUp}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
                )}
              </TabsContent>
            </Tabs>
        </div>

        {/* Minimal footer */}
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <div className="text-[11px] text-white/40">
            <span className="text-white/60 font-medium">Get 1 month premium</span> by signing up
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <span>Trusted by</span>
            <span className="text-white/50 font-medium">700+ barbers</span>
            <span className="flex gap-1 ml-1">
              <span>👍</span>
              <span>❤️</span>
              <span>🔥</span>
              <span>⭐</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
