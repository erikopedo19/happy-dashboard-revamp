import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type AuthTab = "signin" | "signup";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [signUpForm, setSignUpForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberEmail");
    const rememberMe = localStorage.getItem("rememberMe") === "true";

    if (rememberMe && rememberedEmail) {
      setSignInForm((prev) => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true,
      }));
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const canSubmitSignIn = useMemo(() => {
    return signInForm.email.trim().length > 3 && signInForm.password.trim().length > 0;
  }, [signInForm.email, signInForm.password]);

  const canSubmitSignUp = useMemo(() => {
    return (
      signUpForm.fullName.trim().length > 1 &&
      signUpForm.email.trim().length > 3 &&
      signUpForm.password.length >= 6 &&
      signUpForm.confirmPassword.length >= 6
    );
  }, [signUpForm]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitSignIn) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(
        signInForm.email.trim(),
        signInForm.password,
        signInForm.rememberMe
      );

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message || "Unable to sign in. Please try again.",
          variant: "destructive",
        });
        return;
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
        signUpForm.fullName.trim()
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
        description: "Check your email to verify your account.",
      });

      setActiveTab("signin");
      setSignInForm((prev) => ({ ...prev, email: signUpForm.email.trim() }));
      setSignUpForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 md:px-6 md:py-10 flex items-center justify-center font-['Sora',_Inter,_sans-serif]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition-all duration-500 ease-out">
        {/* Left: Form */}
        <Card className="rounded-none border-0 bg-white shadow-none w-full mx-auto h-full flex flex-col transition-all duration-500 ease-out">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <img
                src="/logo.svg"
                alt="Cutzio logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900">
              Welcome to Cutzio
            </CardTitle>
            <CardDescription className="text-gray-500">
              Sign in to manage your barbershop, bookings, team, and reports.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as AuthTab)}
              className="w-full"
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-gray-100 p-1">
                <TabsTrigger
                  value="signin"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Cutzio logo" className="h-4 w-4 object-contain" />
                    Sign in
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Cutzio logo" className="h-4 w-4 object-contain" />
                    Sign up
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@company.com"
                        value={signInForm.email}
                        onChange={(e) =>
                          setSignInForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="h-11 rounded-xl border-gray-200 pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInForm.password}
                        onChange={(e) =>
                          setSignInForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="h-11 rounded-xl border-gray-200 pl-10 pr-10"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember-me"
                        checked={signInForm.rememberMe}
                        onCheckedChange={(checked) =>
                          setSignInForm((prev) => ({ ...prev, rememberMe: !!checked }))
                        }
                      />
                      <Label htmlFor="remember-me" className="cursor-pointer text-sm text-gray-600 flex items-center gap-2">
                        <img src="/logo.svg" alt="Cutzio logo" className="h-3.5 w-3.5 object-contain" />
                        Remember me
                      </Label>
                    </div>

                    <Button
                      type="button"
                      variant="link"
                      onClick={handleForgotPassword}
                      className="h-auto p-0 text-sm text-gray-700"
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? (
                        "Sending..."
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <img src="/logo.svg" alt="Cutzio logo" className="h-3.5 w-3.5 object-contain" />
                          Forgot password?
                        </span>
                      )}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !canSubmitSignIn}
                    className="h-11 w-full rounded-xl bg-gray-900 text-white hover:bg-black"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpForm.fullName}
                        onChange={(e) =>
                          setSignUpForm((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                        className="h-11 rounded-xl border-gray-200 pl-10"
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@company.com"
                        value={signUpForm.email}
                        onChange={(e) =>
                          setSignUpForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="h-11 rounded-xl border-gray-200 pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signUpForm.password}
                        onChange={(e) =>
                          setSignUpForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="h-11 rounded-xl border-gray-200 pl-10 pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signup-confirm-password"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={signUpForm.confirmPassword}
                        onChange={(e) =>
                          setSignUpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        className="h-11 rounded-xl border-gray-200 pl-10 pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                        aria-label={
                          showSignupConfirmPassword ? "Hide confirm password" : "Show confirm password"
                        }
                      >
                        {showSignupConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !canSubmitSignUp}
                    className="h-11 w-full rounded-xl bg-gray-900 text-white hover:bg-black"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-5" />
            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our terms and privacy policy.
            </p>
          </CardContent>
        </Card>

        {/* Right: Image */}
        <Card className="overflow-hidden rounded-none border-0 bg-white shadow-none h-full transition-all duration-500 ease-out">
          <CardContent className="p-0">
            <div className="relative h-full min-h-[320px] w-full md:min-h-[680px] overflow-hidden transition-all duration-500 ease-out">
              <img
                src="/login-hero.png"
                alt="Cutzio barbershop illustration"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-70 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Loading Cutzio
              </div>
              <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/85 p-4 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-gray-900">Cutzio Business Suite</h3>
                <p className="mt-1 text-xs text-gray-600">
                  Manage agenda, services, stylists, teams, and reports from one dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
