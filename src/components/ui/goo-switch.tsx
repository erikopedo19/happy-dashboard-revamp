"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type Transition,
} from "motion/react";
import { cn } from "cn";
import { useReducedMotionPreference } from "devignerui/hooks";
import {
  EASE_OUT,
  SPRING_GOO,
  SPRING_LAYOUT,
  SPRING_MOUSE,
  SPRING_PRESS,
} from "devignerui/motion";
import { useControllableState } from "devignerui/hooks";

// Drawn in a 62x32 viewBox; the button scales it with its height.
const W = 62;
const H = 32;
/** Resting pill width as a multiple of the thumb height. */
const PILL_RATIO = 1.6;
/** Pointer travel past the pinned thumb that fully stretches it over the end. */
const PULL = 22;
/** Goo contrast per device pixel per unit: the blurred edge's alpha slope is
 *  about 0.2 per unit at stdDeviation 2, so 5 spreads the edge over ~1px. */
const GOO_EDGE = 5;
/** Pointer travel before a press becomes a drag. */
const DRAG_SLOP = 3;
/** How far hover and press wash the track toward the background, in %. */
const LIFT_HOVER = 10;
const LIFT_PRESS = 28;

const TRACK_OFF =
  "color-mix(in oklab, var(--muted-foreground) 32%, var(--background))";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/** Mirrors an x drawn for the right end onto the left end. */
const side = (x: number, d: number) => (d < 0 ? W - x : x);

/** Thumb geometry for an inset, in viewBox units. */
function geometry(inset: number) {
  const gap = clamp(inset, 1, 10);
  const th = H - gap * 2; // thumb height, and the pressed thumb's diameter
  const r = th / 2;
  return {
    gap,
    th,
    r,
    pill: th * PILL_RATIO,
    minC: gap + r,
    maxC: W - gap - r,
  };
}
type Geometry = ReturnType<typeof geometry>;

/** Resting thumb center for a state and width: the pill hugs its end. */
const restCenter = (g: Geometry, on: boolean, w: number) =>
  on ? W - g.gap - w / 2 : g.gap + w / 2;

const SIZES = { sm: "h-6", md: "h-8", lg: "h-10" } as const;

export interface GooSwitchClassNames {
  root?: string;
  svg?: string;
}

export interface GooSwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value" | "defaultValue" | "name"
> {
  /** Controlled state. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Fires with the new state. */
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Track height: sm 24px, md 32px, lg 40px. A height class in className
   *  overrides it; the width always follows at 62:32. */
  size?: keyof typeof SIZES;
  /** Gap between the track and the thumb, in 32nds of the track height
   *  (1 to 10). The thumb grows to fill what the gap gives up. */
  inset?: number;
  /** Dragging past an end spreads the thumb over the edge. Off, the thumb
   *  just stops at the end. */
  stretch?: boolean;
  /** How much of the stretch (0 to 1) must be pulled for a release to sling
   *  the thumb to the other side. false never slings. */
  sling?: number | false;
  /** Length of the droplet tail on a toggle, as a multiple of how far it
   *  lags the thumb. 0 hides the tail. */
  trail?: number;
  /** Submitted with a form when checked, like a checkbox. */
  name?: string;
  /** Value submitted under name. */
  value?: string;
  /** Blocks form submission while off. */
  required?: boolean;
  classNames?: GooSwitchClassNames;
}

export function GooSwitch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  size = "md",
  inset = 4,
  stretch = true,
  sling = 0.5,
  trail = 3.2,
  name,
  value = "on",
  required = false,
  form,
  classNames,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerEnter,
  onPointerLeave,
  onClick,
  ...rest
}: GooSwitchProps) {
  const [on, setOn] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onValueChange: onCheckedChange,
  });
  const reduced = useReducedMotionPreference();
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const svg = React.useRef<SVGSVGElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const g = React.useMemo(() => geometry(inset), [inset]);
  // Transforms read the latest geometry and trail when they recompute.
  const live = React.useRef({ g, trail });
  live.current = { g, trail };
  const press = React.useRef<{ x: number; moved: boolean } | null>(null);
  const uid = React.useId().replace(/:/g, "");
  // Goo filter alpha contrast, scaled to screen pixels per viewBox unit so
  // the thresholded edge is about one device pixel wide at any size or
  // density: sharp, but still antialiased.
  const [contrast, setContrast] = React.useState(6);
  React.useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => {
      const px = (el.getBoundingClientRect().width / W) * devicePixelRatio;
      if (px > 0) setContrast(Math.max(4, GOO_EDGE * px));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cx = useMotionValue(restCenter(g, on, g.pill));
  const tail = useMotionValue(restCenter(g, on, g.pill));
  const width = useMotionValue(g.pill);
  const pull = useMotionValue(0);
  const dir = useMotionValue(1);
  const onness = useMotionValue(on ? 1 : 0);
  const lift = useMotionValue(0);

  const to = React.useCallback(
    (mv: MotionValue<number>, target: number, transition: Transition) => {
      if (reduced) mv.jump(target);
      else animate(mv, target, transition);
    },
    [reduced],
  );

  // Settle whenever the state, the press or the drag changes. The head uses
  // the quick layout spring and the tail the heavy goo spring, so a toggle
  // leaves a droplet trailing behind the thumb.
  // The pill only widens again once the drop has mostly landed.
  React.useEffect(() => {
    const w = pressed ? g.th : g.pill;
    to(width, w, pressed ? SPRING_PRESS : { ...SPRING_PRESS, delay: 0.12 });
    if (dragging) return;
    const c = restCenter(g, on, w);
    to(cx, c, SPRING_LAYOUT);
    to(tail, c, { ...SPRING_GOO, delay: 0.05 });
  }, [g, on, pressed, dragging, to, width, cx, tail]);

  // A form reset puts the switch back to its initial state, like a checkbox.
  React.useEffect(() => {
    const owner = input.current?.form;
    if (!owner) return;
    const reset = () => setOn(defaultChecked);
    owner.addEventListener("reset", reset);
    return () => owner.removeEventListener("reset", reset);
  }, [defaultChecked, setOn, name, required, form]);

  React.useEffect(() => {
    to(onness, on ? 1 : 0, { duration: 0.25, ease: EASE_OUT });
  }, [on, to, onness]);

  React.useEffect(() => {
    const target = pressed ? LIFT_PRESS : hovered ? LIFT_HOVER : 0;
    to(lift, target, { duration: 0.2, ease: EASE_OUT });
  }, [pressed, hovered, to, lift]);

  const fill = useTransform(
    [onness, lift],
    ([o, l]: number[]) =>
      `color-mix(in oklab, color-mix(in oklab, var(--primary) ${o * 100}%, ${TRACK_OFF}) ${100 - l}%, var(--background))`,
  );
  const thumbX = useTransform([cx, width], ([c, w]: number[]) => c - w / 2);
  const shadowRx = useTransform(width, (w) => w / 2 + 2);
  // A teardrop from the head back past the lagging tail: full at the neck,
  // tapering along soft curves to a round cap, so it reads as liquid rather
  // than a blade. The lag alone stays inside the thumb, so it is stretched.
  // At rest it collapses into the thumb.
  const tailPath = useTransform([cx, tail], ([c, t]: number[]) => {
    const { g, trail } = live.current;
    const h = g.r * 0.9;
    const len = (t - c) * trail;
    const s = len < 0 ? -1 : 1;
    const tip = c + len;
    const tr = h * 0.38;
    const m = H / 2;
    return (
      `M${c} ${m - h}` +
      `C${c + len * 0.4} ${m - h} ${tip - s * tr * 1.5} ${m - tr} ${tip} ${m - tr}` +
      `A${tr} ${tr} 0 0 ${s > 0 ? 1 : 0} ${tip} ${m + tr}` +
      `C${tip - s * tr * 1.5} ${m + tr} ${c + len * 0.4} ${m + h} ${c} ${m + h}Z`
    );
  });

  // Over-pull, worked out for the right end and mirrored for the left. The
  // thumb spreads over the end cap while a tongue of track pushes into it
  // from inside, thinning it to a crescent.
  const blobAt = (p: number) => lerp(live.current.g.maxC, W - H / 2, p);
  const blobCx = useTransform([pull, dir], ([p, d]: number[]) =>
    side(blobAt(p), d),
  );
  const blobRx = useTransform(pull, (p) =>
    lerp(live.current.g.r, H / 2 + 3, p),
  );
  const blobRy = useTransform(pull, (p) =>
    lerp(live.current.g.r, H / 2 - 1, p),
  );
  const TONGUE_RX = 31;
  const tongueCx = useTransform([pull, dir], ([p, d]: number[]) => {
    const { maxC, r } = live.current.g;
    return side(lerp(maxC - r - 1, W - 4, p) - TONGUE_RX, d);
  });
  const tongueRy = useTransform(pull, (p) =>
    lerp(live.current.g.r * 0.8, H * 0.55, p),
  );
  const tongueOpacity = useTransform(pull, (p) => (p > 0.001 ? 1 : 0));
  // The thumb's shadow would show through where the tongue cuts the thumb.
  const shadowOpacity = useTransform(pull, (p) => 0.14 * (1 - p));

  /** Pointer x in viewBox units. */
  const localX = (clientX: number) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || box.width === 0) return 0;
    return ((clientX - box.left) / box.width) * W;
  };

  const endPress = (commit: boolean) => {
    const p = press.current;
    press.current = null;
    setPressed(false);
    setDragging(false);
    // Let go of the stretch at once: the thumb leaves from where the blob
    // was, and the tail draws the snap back out.
    const stretched = pull.get();
    if (stretched > 0) {
      const at = side(blobAt(stretched), dir.get());
      cx.jump(at);
      tail.jump(at);
      pull.jump(0);
    }
    if (!commit || !p) return;
    if (sling !== false && stretched >= sling) return setOn(dir.get() < 0);
    if (!p.moved) setOn((v) => !v);
    else setOn(cx.get() > W / 2);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        role="switch"
        aria-checked={on}
        aria-required={required || undefined}
        disabled={disabled}
        form={form}
        {...rest}
        onPointerEnter={(e) => {
          onPointerEnter?.(e);
          setHovered(true);
        }}
        onPointerLeave={(e) => {
          onPointerLeave?.(e);
          setHovered(false);
        }}
        onPointerDown={(e) => {
          onPointerDown?.(e);
          if (e.button !== 0 || disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          press.current = { x: localX(e.clientX), moved: false };
          setPressed(true);
        }}
        onPointerMove={(e) => {
          onPointerMove?.(e);
          const p = press.current;
          if (!p) return;
          const x = localX(e.clientX);
          if (!p.moved) {
            if (Math.abs(x - p.x) < DRAG_SLOP) return;
            p.moved = true;
            setDragging(true);
          }
          const c = clamp(x, g.minC, g.maxC);
          const over = x > g.maxC ? x - g.maxC : x < g.minC ? x - g.minC : 0;
          if (over !== 0) dir.set(Math.sign(over));
          if (stretch) pull.set(clamp(Math.abs(over) / PULL, 0, 1));
          to(cx, c, { type: "spring", ...SPRING_MOUSE });
          to(tail, c, SPRING_GOO);
        }}
        onPointerUp={(e) => {
          onPointerUp?.(e);
          endPress(true);
        }}
        onPointerCancel={(e) => {
          onPointerCancel?.(e);
          endPress(false);
        }}
        onClick={(e) => {
          onClick?.(e);
          // Pointer presses toggle on release; detail 0 is Space or Enter.
          if (e.detail === 0 && !disabled) setOn((v) => !v);
        }}
        className={cn(
          "relative inline-block aspect-62/32 shrink-0 cursor-pointer touch-none rounded-full select-none",
          "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          SIZES[size],
          className,
          classNames?.root,
        )}
      >
        <svg
          ref={svg}
          aria-hidden
          viewBox={`0 0 ${W} ${H}`}
          className={cn("block size-full overflow-visible", classNames?.svg)}
        >
          <defs>
            <clipPath id={`${uid}-track`}>
              <rect width={W} height={H} rx={H / 2} />
            </clipPath>
            {/* Blur then raise alpha contrast around 0.5: overlapping shapes
                fuse with a liquid neck and sharp corners melt round. The
                contrast keeps about a device pixel of edge (see contrast). */}
            <filter
              id={`${uid}-goo`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
              <feColorMatrix
                values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${contrast} ${-contrast / 2}`}
              />
            </filter>
            <filter
              id={`${uid}-soft`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="3" />
            </filter>
            {/* The tongue of track that pushes into the stretched thumb, cut
                out of the white rather than painted over it, so the goo
                filter rounds the crescent's tips too. */}
            <mask
              id={`${uid}-tongue`}
              maskUnits="userSpaceOnUse"
              x={-W}
              y={-H}
              width={W * 3}
              height={H * 3}
            >
              <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="white" />
              <motion.ellipse
                cx={tongueCx}
                cy={H / 2}
                rx={TONGUE_RX}
                ry={tongueRy}
                opacity={tongueOpacity}
                fill="black"
              />
            </mask>
          </defs>

          <motion.rect width={W} height={H} rx={H / 2} style={{ fill }} />
          <g clipPath={`url(#${uid}-track)`}>
            <motion.ellipse
              cx={cx}
              cy={H / 2}
              rx={shadowRx}
              ry={g.r + 2}
              fill="black"
              opacity={shadowOpacity}
              filter={`url(#${uid}-soft)`}
            />
          </g>

          {/* White in both themes, like a physical switch; primary-foreground
              turns dark in some dark themes and the drop would vanish. */}
          <g filter={`url(#${uid}-goo)`}>
            <g mask={`url(#${uid}-tongue)`} fill="white">
              <motion.path d={tailPath} />
              <motion.rect
                x={thumbX}
                y={g.gap}
                width={width}
                height={g.th}
                rx={g.r}
              />
              <motion.ellipse
                cx={blobCx}
                cy={H / 2}
                rx={blobRx}
                ry={blobRy}
                opacity={tongueOpacity}
              />
            </g>
          </g>
        </svg>
      </button>
      {/* A real checkbox carries the state into forms and constraint
        validation. Absolute with no offsets, it stays where it would flow,
        so the browser's "required" bubble points at the switch. */}
      {(name !== undefined || required) && (
        <input
          ref={input}
          type="checkbox"
          aria-hidden
          tabIndex={-1}
          name={name}
          value={value}
          form={form}
          checked={on}
          required={required}
          disabled={disabled}
          readOnly
          onFocus={() => button.current?.focus()}
          className="pointer-events-none absolute m-0 size-px -translate-x-full opacity-0"
        />
      )}
    </>
  );
}
