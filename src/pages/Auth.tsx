import { LoginForm } from "@/components/login-form"
import { Seo } from "@/components/Seo"

export default function LoginPage() {
  return (
    <>
      <Seo
        title="Sign in to Cutzioo — Barbershop Booking"
        description="Sign in or create a Cutzioo account to manage bookings, publish your booking page, and grow your barbershop."
        path="/auth"
      />
      <LoginForm />
    </>
  )
}
