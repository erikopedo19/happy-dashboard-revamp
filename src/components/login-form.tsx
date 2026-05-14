import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, ArrowRight, Scissors, UserCircle2 } from "lucide-react"
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

  if (user) {
    navigate("/admin")
  }

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
    <div className="flex min-h-screen w-full items-center justify-center bg-muted dark:bg-[#0c0c0c] p-6 md:p-10" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
      <div className="w-full max-w-sm md:max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-lg transition-all duration-300 hover:shadow-xl dark:shadow-none dark:border dark:border-[#2C2C2E]">
          {/* Left: Form */}
          <div className="flex flex-col p-8 dark:bg-[#1C1C1E]">
            <div className="flex flex-col space-y-2 text-center mb-6">
              <div className="flex justify-center mb-4">
                <img
                  src="/logo.svg"
                  alt="Logo"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Welcome to Cutzio
              </h1>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                Sign in to manage your barbershop
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 transition-all duration-200">
                <TabsTrigger value="signin" className="transition-all duration-200 data-[state=active]:scale-105 data-[state=active]:shadow-md">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="transition-all duration-200 data-[state=active]:scale-105 data-[state=active]:shadow-md">Sign up</TabsTrigger>
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

          {/* Right: Image */}
          <div className="hidden md:block relative overflow-hidden min-h-[600px] bg-gray-50 dark:bg-[#0c0c0c] flex items-center justify-center">
            <img
              src="/Frame 316.png"
              alt="Login illustration"
              className="h-full w-full object-contain dark:opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 dark:from-[#007AFF]/20 dark:to-[#5856D6]/20 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
