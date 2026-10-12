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
  /** Full-bleed scene: storefront covers the whole container, QR settles as a card. */
  scene?: boolean;
}

const QUIET = 2;
const DOOR_ORIGIN = "50% 80%";

// Camera choreography: a slow pull-back (settling the tilt), a smooth approach,
// an accelerating dive through the door, then the pixel field zooms out into
// the QR card.
const T_PULLBACK = 950;
const T_APPROACH_END = 1650;
const T_PUSH_END = 2000;
const T_CANVAS_IN = 1900;
const T_CANVAS_FADE = 200;
const T_ZOOM_OUT = 1150;
const T_BLEND_SPREAD = 700;
const T_BLEND = 320;
const T_DONE = T_CANVAS_IN + T_ZOOM_OUT + 60;
const START_ZOOM = 7;

const FACADE_TILT = 14;
const CANVAS_TILT_X = -18;
const CANVAS_TILT_Y = 8;
const STAGE_TILT_X = 16;
const STAGE_TILT_Y = -14;
const BACK_Z = -90;
const FRONT_Z = 45;

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
const easeInOutSine = (v: number) => -(Math.cos(Math.PI * v) - 1) / 2;
const smootherstep = (v: number) => v * v * v * (v * (v * 6 - 15) + 10);
const easeInExpo = (v: number) => (v <= 0 ? 0 : Math.pow(2, 10 * v - 10));

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function inFinder(r: number, c: number, n: number) {
  return (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
}

/** Storefront that zooms into its door, pixelates and resolves into the booking QR code. */
export function QrReveal({ url, businessName, className, onDone, scene = false }: QrRevealProps) {
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
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const pxW = Math.round(stage.clientWidth * dpr);
      const pxH = Math.round(stage.clientHeight * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }
      const n = qr.size;
      const zoom = START_ZOOM + (1 - START_ZOOM) * smootherstep(clamp01(t / T_ZOOM_OUT));
      const settled = t >= T_ZOOM_OUT + T_BLEND_SPREAD;

      // Layout: in scene mode the QR lives on a white card centred on the dark
      // stage; otherwise it fills the square canvas as before.
      let originX = 0;
      let originY = 0;
      let cardX = 0, cardY = 0, cardSide = pxW;
      let cell: number;
      if (scene) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#0B0B0F";
        ctx.fillRect(0, 0, pxW, pxH);
        cardSide = Math.min(pxW, pxH) * 0.72;
        const pad = cardSide * 0.085;
        cardX = (pxW - cardSide) / 2;
        cardY = (pxH - cardSide) / 2;
        originX = cardX + pad;
        originY = cardY + pad;
        cell = (cardSide - pad * 2) / (n + QUIET * 2);
      } else {
        const px = pxW;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, px, px);
        cell = px / (n + QUIET * 2);
      }

      ctx.translate(pxW / 2, pxH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-pxW / 2, -pxH / 2);

      if (scene) {
        // The white card fades in with the zoom-out so the noise phase reads
        // as pixels on the dark stage instead of a white flash.
        ctx.save();
        ctx.globalAlpha = smootherstep(clamp01(t / T_ZOOM_OUT));
        ctx.fillStyle = "#fff";
        const r = cardSide * 0.075;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(cardX, cardY, cardSide, cardSide, r);
        } else {
          ctx.rect(cardX, cardY, cardSide, cardSide);
        }
        ctx.fill();
        ctx.restore();
      }

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
          // A light module in scene mode is just card-white: skipping it keeps
          // the rounded card edge clean. During the blend it is still painted
          // (its rgb is a colour then), which is what makes the noise.
          ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
          const x = originX + (c + QUIET) * cell;
          const y = originY + (r + QUIET) * cell;
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
    [qr, scene]
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
      facade.style.filter = "none";
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
    facade.style.filter = "none";
    canvasWrap.style.opacity = "0";
    let start: number | null = null;
    let doneFired = false;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = now - start;

      // Stage straightens from its opening tilt as the camera settles.
      const settle = easeInOutSine(clamp01(t / (T_PULLBACK + 500)));
      const sx = STAGE_TILT_X * (1 - settle);
      const sy = STAGE_TILT_Y * (1 - settle);
      stage.style.transform = `rotateX(${sx}deg) rotateY(${sy}deg)`;

      let scale: number;
      let facadeTilt: number;
      let blur = 0;
      if (t < T_PULLBACK) {
        const p = easeInOutSine(clamp01(t / T_PULLBACK));
        scale = 1.18 - 0.18 * p;
        facadeTilt = FACADE_TILT + 4 - 4 * p;
      } else if (t < T_APPROACH_END) {
        const p = smootherstep(clamp01((t - T_PULLBACK) / (T_APPROACH_END - T_PULLBACK)));
        scale = 1 + 1.4 * p;
        facadeTilt = FACADE_TILT * (1 - p);
      } else {
        const p = clamp01((t - T_APPROACH_END) / (T_PUSH_END - T_APPROACH_END));
        scale = 2.4 + 8.6 * easeInExpo(p);
        facadeTilt = FACADE_TILT * (1 - p);
        blur = 9 * easeInCubic(p);
      }
      facade.style.transform = `scale(${scale}) rotateX(${facadeTilt}deg)`;
      facade.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "none";

      const ct = t - T_CANVAS_IN;
      if (ct >= 0) {
        const fade = clamp01(ct / T_CANVAS_FADE);
        const zt = smootherstep(clamp01(ct / T_ZOOM_OUT));
        canvasWrap.style.opacity = String(fade);
        canvasWrap.style.transform =
          `rotateX(${CANVAS_TILT_X * (1 - zt)}deg) rotateY(${CANVAS_TILT_Y * (1 - zt)}deg) ` +
          `scale(${0.96 + 0.04 * zt})`;
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
      if (canvasWrapRef.current?.style.opacity === "1") draw(Number.POSITIVE_INFINITY);
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
        scene
          ? "absolute inset-0 block h-full w-full overflow-hidden bg-[#0B0B0F]"
          : "relative block aspect-square w-full overflow-hidden rounded-[24px] bg-white",
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
              transform: `scale(1.18) rotateX(${FACADE_TILT + 4}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="absolute inset-0"
              style={{ transform: `translateZ(${BACK_Z}px)` }}
            >
              <Backdrop />
            </div>
            <div
              className="absolute inset-0"
              style={{ transform: `translateZ(${FRONT_Z}px)` }}
            >
              <Shopfront sign={sign} />
            </div>
          </div>
          <div
            ref={canvasWrapRef}
            aria-hidden
            className="absolute inset-0 will-change-transform"
            style={{
              opacity: 0,
              transformOrigin: "50% 50%",
              transform: `rotateX(${CANVAS_TILT_X}deg) rotateY(${CANVAS_TILT_Y}deg) scale(0.96)`,
            }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </div>
    </button>
  );
}

/** Building, sky and street behind the shopfront (far parallax layer). */
function Backdrop() {
  const windows = [6, 22, 38, 54, 70, 86];
  const floors = [-2, 10, 22, 34, 46];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="qr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B1B20" />
          <stop offset="1" stopColor="#3A3F49" />
        </linearGradient>
        <linearGradient id="qr-brick" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E2CFAF" />
          <stop offset="1" stopColor="#CDB896" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#qr-sky)" />
      <rect x="-20" y="12" width="26" height="88" fill="#8E8274" />
      <rect x="94" y="20" width="26" height="80" fill="#7C7266" />
      <rect x="2" y="4" width="96" height="96" fill="url(#qr-brick)" />
      {floors.map((y) => (
        <rect key={y} y={y + 11.2} x="2" width="96" height="0.5" fill="#B49B77" />
      ))}
      {floors.map((y) =>
        windows.map((x) => (
          <g key={`${x}-${y}`}>
            <rect x={x - 0.8} y={y + 14} width="9.6" height="1.6" fill="#B49B77" />
            <rect x={x} y={y} width="8" height="14" rx="0.5" fill="#F7EFE2" />
            <rect x={x + 0.7} y={y + 0.7} width="6.6" height="12.6" fill="#39424E" />
            <rect x={x + 3.7} y={y + 0.7} width="0.6" height="12.6" fill="#F7EFE2" />
            <rect x={x + 0.7} y={y + 6.4} width="6.6" height="0.6" fill="#F7EFE2" />
          </g>
        ))
      )}
      <rect y="88" width="100" height="12" fill="#4A463F" />
      <rect y="88" width="100" height="1.2" fill="#35322C" />
    </svg>
  );
}

/** Awning, sign, windows, barber pole and door (near parallax layer). */
function Shopfront({ sign }: { sign: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <pattern id="qr-pole" width="2" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="2" height="1.5" fill="#FF2D46" />
          <rect y="1.5" width="2" height="1.5" fill="#fff" />
        </pattern>
      </defs>
      <rect x="4" y="58" width="92" height="8" rx="1" fill="#FF2D46" />
      <text
        x="50"
        y="63.7"
        textAnchor="middle"
        fontSize="3.4"
        fontWeight="700"
        letterSpacing="0.7"
        fill="#fff"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        {sign}
      </text>
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={4 + i * (92 / 24)} y="66" width={92 / 24} height="5" fill={i % 2 ? "#fff" : "#FF2D46"} />
      ))}
      <rect x="4" y="70.5" width="92" height="1.4" rx="0.7" fill="#C22436" />
      <rect x="4" y="71.9" width="92" height="16" fill="#F4F1EA" />
      {[7, 63].map((x) => (
        <g key={x}>
          <rect x={x} y="73" width="30" height="13" rx="0.6" fill="#CFE0E8" />
          <rect x={x + 2.5} y="74.2" width="5" height="9" rx="1" fill="#1B1B20" opacity="0.55" />
          <rect x={x + 11} y="74.8" width="6" height="7" rx="0.6" fill="#fff" opacity="0.7" />
          <rect x={x + 20} y="74.2" width="5" height="9" rx="1" fill="#1B1B20" opacity="0.55" />
        </g>
      ))}
      <rect x="40.5" y="72.5" width="2" height="15" rx="1" fill="url(#qr-pole)" />
      <rect x="40" y="71.6" width="3" height="1.4" rx="0.6" fill="#C9CED6" />
      <rect x="40" y="87" width="3" height="1.4" rx="0.6" fill="#C9CED6" />
      <rect x="44" y="72.5" width="12" height="15.5" fill="#1B1B20" />
      <rect x="45.5" y="74" width="9" height="5.5" fill="#2A2A31" />
      <circle cx="53.6" cy="82" r="0.7" fill="#A3E635" />
      <rect x="4" y="87.9" width="92" height="1.6" fill="#D9D2C5" />
    </svg>
  );
}
