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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0203] via-[#1a0509] to-[#2b0a14] p-4 text-white md:p-10" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 animate-pulse rounded-full bg-[#fb7185]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 animate-pulse rounded-full bg-[#be123c]/35 blur-3xl [animation-delay:700ms]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[#9f1239]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-700 md:max-w-5xl">
        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(244,63,94,0.18)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_32px_100px_rgba(244,63,94,0.28)] md:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex flex-col items-center space-y-2 text-center mb-6">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#fb7185] to-[#9f1239] shadow-[0_12px_40px_rgba(244,63,94,0.45)] ring-1 ring-white/20">
                <img src="/logo.svg" alt="Cutzio" className="h-11 w-11 object-contain brightness-0 invert" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Welcome to Cutzio
              </h1>
              <p className="text-sm text-white/60" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
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

          <div className="relative hidden min-h-[620px] overflow-hidden bg-[#080808] md:flex md:flex-col md:items-center md:justify-center gap-0">
            {/* Brand glow orbs */}
            <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#e11d48]/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-[#9f1239]/20 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e11d48]/08 blur-2xl" />
            {/* Frame 316 brand image */}
            <img
              src="/Frame 316.png"
              alt="Cutzioo"
              className="relative z-10 w-[82%] max-w-[320px] drop-shadow-[0_0_40px_rgba(225,29,72,0.25)] animate-in fade-in zoom-in-95 duration-700"
            />
            {/* Tagline + stat cards */}
            <div className="relative z-10 w-full px-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <p className="text-center text-white/75 text-sm font-medium mb-5 tracking-wide">
                The booking platform built for modern barbers.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm">
                  <CalendarCheck className="mb-2.5 h-5 w-5 text-[#e11d48]" />
                  <p className="text-white text-sm font-semibold">Smart Booking</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed">Fill your chair effortlessly</p>
                </div>
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm">
                  <ShieldCheck className="mb-2.5 h-5 w-5 text-[#e11d48]" />
                  <p className="text-white text-sm font-semibold">Secure Auth</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed">Powered by Supabase</p>
                </div>
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm">
                  <Sparkles className="mb-2.5 h-5 w-5 text-[#e11d48]" />
                  <p className="text-white text-sm font-semibold">Live Analytics</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed">Real-time insights</p>
                </div>
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm">
                  <Scissors className="mb-2.5 h-5 w-5 text-[#e11d48]" />
                  <p className="text-white text-sm font-semibold">Client CRM</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed">Remember every client</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
