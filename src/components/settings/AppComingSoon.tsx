import { motion } from "framer-motion";

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.39-3.68zM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z" />
    </svg>
  );
}

function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

const PLATFORMS = [
  { key: "ios", label: "iOS", store: "App Store", Icon: AppleGlyph, tint: "from-[#3a3a3e] to-[#1c1c1e]" },
  { key: "android", label: "Android", store: "Google Play", Icon: AndroidGlyph, tint: "from-[#1f3b2a] to-[#121a15]" },
];

export function AppComingSoon() {
  return (
    <div>
      <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8E8E93] dark:text-white/40">
        Get the app
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map(({ key, label, store, Icon, tint }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.06 }}
            className={`relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-gradient-to-br ${tint} p-4 text-white`}
          >
            <Icon className="h-7 w-7 text-white" />
            <p className="mt-3 text-[15px] font-semibold leading-tight">{label}</p>
            <p className="text-[11px] text-white/50">{store}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 ring-1 ring-white/10">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              Coming soon
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default AppComingSoon;
