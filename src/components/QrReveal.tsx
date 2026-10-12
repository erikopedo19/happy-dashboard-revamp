import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface QrRevealProps {
  url: string;
  businessName: string;
  className?: string;
  onDone?: () => void;
}

const QUIET = 2;
const DOOR_ORIGIN = "50% 80%";

const T_PULLBACK = 450;
const T_PUSH_END = 1250;
const T_CANVAS_IN = 1200;
const T_CANVAS_FADE = 110;
const T_ZOOM_OUT = 1000;
const T_BLEND_SPREAD = 650;
const T_BLEND = 300;
const T_DONE = T_CANVAS_IN + T_ZOOM_OUT + 50;
const START_ZOOM = 6;
const FACADE_TILT = 12;
const CANVAS_TILT = -18;
const STAGE_TILT_X = 14;
const STAGE_TILT_Y = -12;

const START_COLORS: [number, number, number][] = [
  [27, 27, 32],
  [27, 27, 32],
  [27, 27, 32],
  [42, 42, 49],
  [122, 26, 38],
  [80, 104, 30],
];
const DARK: [number, number, number] = [11, 11, 15];
const LIGHT: [number, number, number] = [255, 255, 255];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInCubic = (v: number) => v * v * v;
const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3);
const easeOutQuad = (v: number) => 1 - (1 - v) * (1 - v);

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function inFinder(r: number, c: number, n: number) {
  return (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
}

/** Storefront that zooms into its door, pixelates and resolves into the booking QR code. */
export function QrReveal({ url, businessName, className, onDone }: QrRevealProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const facadeRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [runId, setRunId] = useState(0);

  const qr = useMemo(() => {
    try {
      const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
      return { size: modules.size, data: modules.data };
    } catch {
      return null;
    }
  }, [url]);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage || !qr) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const css = stage.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const px = Math.round(css * dpr);
      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      const n = qr.size;
      const cell = px / (n + QUIET * 2);
      const zoom = START_ZOOM + (1 - START_ZOOM) * easeOutCubic(clamp01(t / T_ZOOM_OUT));
      const settled = t >= T_ZOOM_OUT + T_BLEND_SPREAD;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, px, px);
      ctx.translate(px / 2, px / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-px / 2, -px / 2);

      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const i = r * n + c;
          const dark = qr.data[i] === 1;
          const target = dark ? DARK : LIGHT;
          let rgb = target;
          if (!settled) {
            const spread = inFinder(r, c, n) ? 0.25 : 1;
            const start = seeded(i) * T_BLEND_SPREAD * spread;
            const b = easeOutQuad(clamp01((t - start) / T_BLEND));
            const from = START_COLORS[Math.floor(seeded(i + 7919) * START_COLORS.length)];
            rgb = [
              Math.round(from[0] + (target[0] - from[0]) * b),
              Math.round(from[1] + (target[1] - from[1]) * b),
              Math.round(from[2] + (target[2] - from[2]) * b),
            ];
          }
          if (rgb === LIGHT) continue;
          ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
          const x = (c + QUIET) * cell;
          const y = (r + QUIET) * cell;
          if (settled) {
            const x0 = Math.round(x);
            const y0 = Math.round(y);
            ctx.fillRect(x0, y0, Math.round(x + cell) - x0, Math.round(y + cell) - y0);
          } else {
            ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
          }
        }
      }
    },
    [qr]
  );

  useEffect(() => {
    const stage = stageRef.current;
    const facade = facadeRef.current;
    const canvasWrap = canvasWrapRef.current;
    const canvas = canvasRef.current;
    if (!stage || !facade || !canvasWrap || !canvas || !qr) return;

    const finish = () => {
      stage.style.transform = "none";
      facade.style.opacity = "0";
      canvasWrap.style.opacity = "1";
      canvasWrap.style.transform = "none";
      draw(Number.POSITIVE_INFINITY);
      onDoneRef.current?.();
    };

    if (reduceMotion) {
      finish();
      return;
    }

    facade.style.opacity = "1";
    canvasWrap.style.opacity = "0";
    let start: number | null = null;
    let doneFired = false;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = now - start;

      const settle = easeOutCubic(clamp01(t / T_CANVAS_IN));
      const sx = STAGE_TILT_X * (1 - settle);
      const sy = STAGE_TILT_Y * (1 - settle);
      stage.style.transform = `rotateX(${sx}deg) rotateY(${sy}deg)`;

      let scale: number;
      let facadeTilt: number;
      if (t < T_PULLBACK) {
        scale = 1.12 - 0.12 * easeOutCubic(t / T_PULLBACK);
        facadeTilt = FACADE_TILT + 3 - 3 * easeOutCubic(t / T_PULLBACK);
      } else {
        const p = easeInCubic(clamp01((t - T_PULLBACK) / (T_PUSH_END - T_PULLBACK)));
        scale = 1 + 8 * p;
        facadeTilt = FACADE_TILT * (1 - p);
      }
      facade.style.transform = `scale(${scale}) rotateX(${facadeTilt}deg)`;

      const ct = t - T_CANVAS_IN;
      if (ct >= 0) {
        const fade = clamp01(ct / T_CANVAS_FADE);
        const zt = easeOutCubic(clamp01(ct / T_ZOOM_OUT));
        canvasWrap.style.opacity = String(fade);
        canvasWrap.style.transform = `rotateX(${CANVAS_TILT * (1 - zt)}deg) scale(${0.97 + 0.03 * zt})`;
        facade.style.opacity = String(1 - fade);
        draw(ct);
      }

      if (t >= T_DONE && !doneFired) {
        doneFired = true;
        haptic("light");
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [qr, draw, reduceMotion, runId]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (canvasRef.current?.style.opacity === "1") draw(Number.POSITIVE_INFINITY);
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  const sign = (businessName || "Cutzioo").toUpperCase().slice(0, 22);

  return (
    <button
      type="button"
      onClick={() => setRunId((v) => v + 1)}
      aria-label="Booking QR code. Tap to replay the animation"
      className={cn(
        "relative block aspect-square w-full overflow-hidden rounded-[24px] bg-white",
        "active:scale-[0.99] transition-transform",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="absolute inset-0" style={{ perspective: "1100px" }}>
        <div
          ref={stageRef}
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `rotateX(${STAGE_TILT_X}deg) rotateY(${STAGE_TILT_Y}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            ref={facadeRef}
            aria-hidden
            className="absolute inset-0 will-change-transform"
            style={{
              transformOrigin: DOOR_ORIGIN,
              transform: `scale(1.12) rotateX(${FACADE_TILT + 3}deg)`,
            }}
          >
            <Storefront sign={sign} />
          </div>
          <div
            ref={canvasWrapRef}
            aria-hidden
            className="absolute inset-0 will-change-transform"
            style={{
              opacity: 0,
              transformOrigin: "50% 50%",
              transform: `rotateX(${CANVAS_TILT}deg) scale(0.97)`,
            }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </div>
    </button>
  );
}

function Storefront({ sign }: { sign: string }) {
  const windows = [12, 41, 70];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <pattern id="qr-pole" width="2" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="2" height="1.5" fill="#FF2D46" />
          <rect y="1.5" width="2" height="1.5" fill="#fff" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="#EADBC4" />
      {[6, 12, 18, 24, 30, 36, 42, 48].map((y) => (
        <rect key={y} y={y} width="100" height="0.35" fill="#DCCAB0" />
      ))}
      {[8, 30].map((y) =>
        windows.map((x) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="18" height="16" rx="0.6" fill="#F7EFE2" />
            <rect x={x + 1.5} y={y + 1.5} width="15" height="13" fill="#4B5866" />
            <rect x={x + 8.6} y={y + 1.5} width="0.8" height="13" fill="#F7EFE2" />
            <rect x={x + 1.5} y={y + 7.6} width="15" height="0.8" fill="#F7EFE2" />
            <rect x={x - 0.8} y={y + 16} width="19.6" height="1.4" fill="#D6C3A6" />
          </g>
        ))
      )}
      <rect y="53" width="100" height="3" fill="#D6C3A6" />
      <rect x="6" y="57" width="88" height="7" rx="1" fill="#FF2D46" />
      <text
        x="50"
        y="61.9"
        textAnchor="middle"
        fontSize="3.2"
        fontWeight="700"
        letterSpacing="0.6"
        fill="#fff"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        {sign}
      </text>
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={6 + i * 4} y="64" width="4" height="4" fill={i % 2 ? "#fff" : "#FF2D46"} />
      ))}
      <rect x="6" y="68" width="88" height="22" fill="#F4F1EA" />
      {[9, 61].map((x) => (
        <g key={x}>
          <rect x={x} y="70" width="30" height="16" rx="0.6" fill="#CFE0E8" />
          <rect x={x + 3} y="76" width="5" height="7" rx="1" fill="#1B1B20" opacity="0.55" />
          <rect x={x + 12} y="72" width="6" height="8" rx="0.6" fill="#fff" opacity="0.7" />
          <rect x={x + 21} y="76" width="5" height="7" rx="1" fill="#1B1B20" opacity="0.55" />
          <circle cx={x + 27.5} cy="84" r="2.2" fill="#A3E635" />
        </g>
      ))}
      <rect x="40.5" y="71" width="2" height="13" rx="1" fill="url(#qr-pole)" />
      <rect x="40" y="70.2" width="3" height="1.4" rx="0.6" fill="#C9CED6" />
      <rect x="40" y="83.6" width="3" height="1.4" rx="0.6" fill="#C9CED6" />
      <rect x="44" y="70" width="12" height="20" fill="#1B1B20" />
      <rect x="46" y="72" width="8" height="6" fill="#2A2A31" />
      <circle cx="53.6" cy="81" r="0.7" fill="#A3E635" />
      <rect y="90" width="100" height="10" fill="#D9D2C5" />
      <rect y="90" width="100" height="0.8" fill="#C7BEAE" />
    </svg>
  );
}
