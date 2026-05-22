import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, ArrowRight, Scissors, UserCircle2, Sparkles, CalendarCheck, ShieldCheck } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, signIn, signUp, resetPassword } = useAuth()
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)

  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [signUpForm, setSignUpForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "client" as "barber" | "client",
  })

  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role
      if (role === "client") {
        navigate("/find-barber", { replace: true })
      } else if (role === "barber") {
        navigate("/admin", { replace: true })
      } else {
        navigate("/choose-role", { replace: true })
      }
    }
  }, [user, navigate])

  const canSubmitSignIn = signInForm.email.trim().length > 3 && signInForm.password.trim().length > 0
  const canSubmitSignUp = 
    signUpForm.fullName.trim().length > 1 &&
    signUpForm.email.trim().length > 3 &&
    signUpForm.password.length >= 6 &&
    signUpForm.confirmPassword.length >= 6

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitSignIn) return

    setIsLoading(true)
    try {
      const { error } = await signIn(
        signInForm.email.trim(),
        signInForm.password,
        signInForm.rememberMe
      )

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message || "Unable to sign in. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Welcome back",
        description: "You signed in successfully.",
      })
    } catch (_err) {
      toast({
        title: "Sign in failed",
        description: "Unexpected error while signing in.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitSignUp) return

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and confirm password must match.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await signUp(
        signUpForm.email.trim(),
        signUpForm.password,
        signUpForm.fullName.trim(),
        signUpForm.role
      )

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message || "Unable to create account or send confirmation email.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Account created",
        description: signUpForm.role === "barber"
          ? "Welcome aboard. Check your email to verify your barber account."
          : "Welcome. Check your email to verify your account.",
      })

      setActiveTab("signin")
      setSignInForm((prev) => ({ ...prev, email: signUpForm.email.trim() }))
      setSignUpForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "client",
      })
    } catch (_err) {
      toast({
        title: "Sign up failed",
        description: "Unexpected error while creating your account.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!signInForm.email.trim()) {
      toast({
        title: "Enter your email first",
        description: "Type your account email, then click Forgot password.",
        variant: "destructive",
      })
      return
    }

    setIsResettingPassword(true)
    try {
      const { error } = await resetPassword(signInForm.email.trim())

      if (error) {
        toast({
          title: "Reset email failed",
          description: error.message || "Could not send reset email.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Reset email sent",
        description: "Check your inbox for the password reset link.",
      })
    } catch (_err) {
      toast({
        title: "Reset email failed",
        description: "Unexpected error while sending reset email.",
        variant: "destructive",
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F5F5F7] p-4 text-[#1D1D1F] dark:bg-[#050507] dark:text-white md:p-10" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
      <div className="absolute -left-24 top-10 h-72 w-72 animate-pulse rounded-full bg-[#007AFF]/25 blur-3xl" />
      <div className="absolute -right-24 bottom-8 h-80 w-80 animate-pulse rounded-full bg-[#AF52DE]/25 blur-3xl [animation-delay:700ms]" />
      <div className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-[#34C759]/10 blur-3xl" />

      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-700 md:max-w-5xl">
        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[32px] border border-white/60 bg-white/75 shadow-[0_24px_80px_rgba(0,0,0,0.14)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_32px_100px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#1C1C1E]/70 md:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col p-6 sm:p-8 dark:bg-transparent">
            <div className="flex flex-col space-y-2 text-center mb-6">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-lg shadow-black/10 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                <img src="/logo.svg" alt="Logo" className="h-10 w-10 object-contain" />
              </div>
              <div className="mx-auto mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#007AFF]/20 bg-[#007AFF]/10 px-3 py-1 text-xs font-semibold text-[#007AFF]">
                <Sparkles className="h-3.5 w-3.5" />
                iOS-style booking workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Welcome to Cutzio
              </h1>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                Sign in to manage bookings, clients, and your barbershop flow.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
              <TabsList className="grid h-12 w-full grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10">
                <TabsTrigger value="signin" className="h-10 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/15">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="h-10 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/15">Sign up</TabsTrigger>
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
                        onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
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
                        onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={signInForm.rememberMe}
                        onCheckedChange={(checked) => setSignInForm(prev => ({ ...prev, rememberMe: !!checked }))}
                        className="transition-all duration-200 hover:scale-110 active:scale-95"
                      />
                      <Label htmlFor="remember" className="text-sm cursor-pointer transition-colors hover:text-foreground">Remember me</Label>
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
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Role chooser */}
                  <div className="space-y-2">
                    <Label>I'm signing up as</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "client", label: "Client", desc: "Book appointments", Icon: UserCircle2 },
                        { key: "barber", label: "Barber", desc: "Manage my shop", Icon: Scissors },
                      ] as const).map(({ key, label, desc, Icon }) => {
                        const selected = signUpForm.role === key
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setSignUpForm(prev => ({ ...prev, role: key }))}
                            className={cn(
                              "relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                              selected
                                ? "border-[#007AFF] bg-[#007AFF]/5 shadow-sm"
                                : "border-border hover:border-[#007AFF]/40 hover:bg-muted/40"
                            )}
                            aria-pressed={selected}
                          >
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              selected ? "bg-[#007AFF] text-white" : "bg-muted text-muted-foreground"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-sm font-semibold">{label}</div>
                            <div className="text-[11px] text-muted-foreground">{desc}</div>
                          </button>
                        )
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
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, fullName: e.target.value }))}
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
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
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
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
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
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
              </TabsContent>
            </Tabs>
          </div>

          <div className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-[#0A84FF] via-[#5856D6] to-[#AF52DE] p-8 md:flex md:items-center md:justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_30%),radial-gradient(circle_at_75%_65%,rgba(255,255,255,0.22),transparent_35%)]" />
            <div className="absolute right-10 top-10 h-24 w-24 animate-bounce rounded-[28px] bg-white/15 backdrop-blur-xl [animation-duration:4s]" />
            <div className="absolute bottom-16 left-10 h-32 w-32 animate-pulse rounded-full bg-white/15 blur-sm" />
            <div className="relative w-full max-w-sm">
              <div className="animate-in fade-in zoom-in-95 duration-700 rounded-[36px] border border-white/25 bg-white/20 p-5 shadow-2xl backdrop-blur-2xl">
                <div className="rounded-[28px] bg-white/90 p-4 text-[#1D1D1F] shadow-xl">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Today</p>
                      <p className="text-2xl font-bold">12 bookings</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34C759] text-white">
                      <CalendarCheck className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {["Fade & beard", "Classic cut", "Color refresh"].map((item, index) => (
                      <div key={item} className="flex items-center justify-between rounded-2xl bg-[#F2F2F7] p-3">
                        <div>
                          <p className="text-sm font-semibold">{item}</p>
                          <p className="text-xs text-[#8E8E93]">{9 + index}:30 · confirmed</p>
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full bg-[#34C759]" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-white">
                  <div className="rounded-3xl bg-white/15 p-4 backdrop-blur-xl">
                    <ShieldCheck className="mb-3 h-5 w-5" />
                    <p className="text-sm font-semibold">Secure auth</p>
                    <p className="text-xs text-white/75">Supabase powered</p>
                  </div>
                  <div className="rounded-3xl bg-white/15 p-4 backdrop-blur-xl">
                    <Sparkles className="mb-3 h-5 w-5" />
                    <p className="text-sm font-semibold">Live stats</p>
                    <p className="text-xs text-white/75">Always fresh</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
