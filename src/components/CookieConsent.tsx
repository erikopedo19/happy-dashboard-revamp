import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cutzio:cookie-consent";

export type CookieChoice = "accepted" | "necessary";

export function getCookieConsent(): CookieChoice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (choice: CookieChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: choice }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-3xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5">
          <Cookie className="h-4.5 w-4.5 text-foreground/70" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 id="cookie-consent-title" className="text-sm font-semibold text-foreground">
            We use cookies
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Necessary cookies keep you signed in and payments secure. Optional ones only help us count anonymous usage.
            Read our{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
              Cookies Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("necessary")}
          className="h-10 flex-1 rounded-full border border-border/70 px-4 text-sm font-medium text-foreground/80 transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        >
          Necessary only
        </button>
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="h-10 flex-1 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
