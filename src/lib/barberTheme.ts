// Per-barber theme colors for Explore cards and map pins.
// Barbers who picked a brand color get it everywhere; everyone else gets the
// neutral grey + rose default.

export const DEFAULT_BARBER_BASE = "#48484A";
export const DEFAULT_BARBER_ACCENT = "#FB7185";

// Values the backend/app fill in automatically when a barber never chose a color.
const AUTO_FILLED_COLORS = new Set(["#e0c4a8", "#e11d48"]);

export interface BarberTheme {
  isCustom: boolean;
  /** Main surface color (banner, avatar, map pin). */
  base: string;
  /** Highlight color (icons, chips, rings). */
  accent: string;
  /** Text color that reads well on top of `base`. */
  onBase: string;
  banner: string;
  avatar: string;
  button: string;
  /** Soft translucent tint of the accent, for icon tiles. */
  soft: string;
}

export function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const long = /^#?([0-9a-f]{6})$/.exec(v);
  return long ? `#${long[1]}` : null;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Mix `hex` toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(toRgb(hex).map((c) => c + (target - c) * t) as [number, number, number]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableTextOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#1C1C1E" : "#FFFFFF";
}

export function getBarberTheme(brandColor?: string | null): BarberTheme {
  const hex = normalizeHex(brandColor);
  if (hex && !AUTO_FILLED_COLORS.has(hex)) {
    return {
      isCustom: true,
      base: hex,
      accent: hex,
      onBase: readableTextOn(hex),
      banner: `linear-gradient(135deg, ${shade(hex, 0.12)} 0%, ${hex} 45%, ${shade(hex, -0.35)} 100%)`,
      avatar: `linear-gradient(135deg, ${shade(hex, 0.1)}, ${shade(hex, -0.25)})`,
      button: `linear-gradient(180deg, ${shade(hex, 0.15)} 0%, ${hex} 55%, ${shade(hex, -0.2)} 100%)`,
      soft: `${hex}1f`,
    };
  }
  return {
    isCustom: false,
    base: DEFAULT_BARBER_BASE,
    accent: DEFAULT_BARBER_ACCENT,
    onBase: "#FFFFFF",
    banner: `radial-gradient(120% 140% at 100% 0%, ${DEFAULT_BARBER_ACCENT}59 0%, transparent 55%), linear-gradient(135deg, #636366 0%, #48484A 50%, #2C2C2E 100%)`,
    avatar: `linear-gradient(135deg, #8E8E93 0%, #48484A 70%, ${DEFAULT_BARBER_ACCENT} 140%)`,
    button: "linear-gradient(180deg, #6E6E73 0%, #48484A 55%, #3A3A3C 100%)",
    soft: `${DEFAULT_BARBER_ACCENT}1f`,
  };
}
