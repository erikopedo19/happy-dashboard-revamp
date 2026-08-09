import { createContext, useContext, useState, ReactNode } from "react";

interface OnboardingContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <OnboardingContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingVisibility() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboardingVisibility must be used within OnboardingProvider");
  return ctx;
}
