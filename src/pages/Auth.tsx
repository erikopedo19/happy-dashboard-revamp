import { useState } from "react"
import { LoginForm } from "@/components/login-form"
import { Seo } from "@/components/Seo"
import { OnboardingIntro, hasSeenIntro } from "@/components/OnboardingIntro"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
  const { user } = useAuth()
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro())

  return (
    <>
      <Seo
        title="Sign in to Cutzioo — Barbershop Booking"
        description="Sign in or create a Cutzioo account to manage bookings, publish your booking page, and grow your barbershop."
        path="/auth"
      />
      {showIntro && !user ? <OnboardingIntro onDone={() => setShowIntro(false)} /> : <LoginForm />}
    </>
  )
}
