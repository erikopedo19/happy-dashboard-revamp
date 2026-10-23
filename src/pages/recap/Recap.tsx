import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { SEASONAL_THEMES, pickSeasonalTheme, seasonalCopy, type SeasonalTheme } from "@/lib/seasonal";
import { HEAT_DAYS, HEAT_HOURS, useRecapStats, type RecapMode, type RecapStats } from "@/hooks/useRecapStats";
import s from "./recap.module.css";

const DUR = 5600;
const N = 8;
const LOGO_PATH =
  "M105,223 L107,226 L153,253 L157,252 L135,222 L124,221Z M58,210 L68,227 L94,261 L147,259 L149,257 L148,255 L119,239 L100,231 L60,209Z M437,127 L360,127 L234,331 L227,337 L222,337 L217,333 L174,273 L166,266 L158,264 L99,267 L97,268 L96,273 L191,406 L197,409 L263,408 L269,403 L443,144 L443,133Z";
const THEMES = [
  { c: ["#ff7a1a", "#ff3d71", "#7a3cff"], p: [[-20, -10], [35, 30], [0, 60]] },
  { c: ["#ff7a1a", "#ffb347", "#ff3d71"], p: [[30, -20], [-25, 35], [25, 65]] },
  { c: ["#7a3cff", "#ff3d71", "#4da3ff"], p: [[-25, 25], [30, -15], [10, 55]] },
  { c: ["#ff9f1c", "#ff7a1a", "#ff3d71"], p: [[10, -25], [-30, 20], [30, 50]] },
  { c: ["#ff3d71", "#ff7a1a", "#a855f7"], p: [[-30, -5], [30, 25], [-5, 65]] },
  { c: ["#ff7a1a", "#ff3d71", "#7a3cff"], p: [[0, -15], [-30, 40], [30, 55]] },
  { c: ["#ff3d71", "#7a3cff", "#ff7a1a"], p: [[-10, -20], [35, 35], [-25, 55]] },
];
const PAGE_THEME = [0, 1, 2, 6, 3, 4, 5, 0];
const eur = (n: number) => `€${Math.round(n).toLocaleString()}`;
const v = (o: Record<string, string | number>) => o as CSSProperties;

/* ---------- small pieces ---------- */

function Logo({ className, draw }: { className?: string; draw?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 512 512">
      {draw && (
        <defs>
          <mask id="recapMark" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <path className={s.dw} pathLength={1} d="M52 202 L240 390 L458 112" />
          </mask>
        </defs>
      )}
      <rect width="512" height="512" rx="112" fill="rgba(255,255,255,.12)" />
      <path fill="#ff7a1a" mask={draw ? "url(#recapMark)" : undefined} d={LOGO_PATH} />
    </svg>
  );
}

function Count({ to, pre = "", suf = "", dec = 0, delay = 350, run }: { to: number; pre?: string; suf?: string; dec?: number; delay?: number; run: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t0 = performance.now() + delay;
    let raf = 0;
    const f = (n: number) => {
      const k = Math.max(0, Math.min(1, (n - t0) / 1500));
      const val = k === 1 ? to : to * (1 - Math.pow(2, -10 * k));
      el.textContent = pre + val.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (k < 1) raf = requestAnimationFrame(f);
    };
    el.textContent = pre + (0).toFixed(dec) + suf;
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, pre, suf, dec, delay, run]);
  return <span ref={ref} />;
}

/** A story page. `run` changes on every (re)entry so the CSS entrance plays again. */
function Page({ active, run, className, children, theme }: { active: boolean; run: number; className?: string; children: ReactNode; theme?: SeasonalTheme }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    if (!active) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [active, run]);
  return (
    <section className={[s.pg, className].filter(Boolean).join(" ")} data-active={on ? "" : undefined} data-theme={theme}>
      {children}
    </section>
  );
}

/* ---------- seasonal invite page ---------- */

function Fireworks({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !active) return;
    const fc = cv.getContext("2d");
    if (!fc) return;
    cv.width = cv.clientWidth * 2;
    cv.height = cv.clientHeight * 2;
    type P = { x: number; y: number; vx: number; vy: number; l: number; c: string };
    let parts: P[] = [];
    let next = 0;
    let raf = 0;
    const frame = (now: number) => {
      if (now > next) {
        next = now + 450 + Math.random() * 650;
        const cx = cv.width * (0.15 + Math.random() * 0.7), cy = cv.height * (0.1 + Math.random() * 0.3);
        const col = ["255,214,110", "127,210,255", "255,130,170", "255,255,255"][Math.floor(Math.random() * 4)];
        for (let i = 0; i < 52; i++) {
          const a = (i / 52) * 6.283, sp = 2 + Math.random() * 3.4;
          parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1, c: col });
        }
      }
      fc.clearRect(0, 0, cv.width, cv.height);
      fc.globalCompositeOperation = "lighter";
      fc.lineCap = "round";
      fc.lineWidth = 3;
      parts = parts.filter((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.vy *= 0.985; p.l -= 0.012;
        if (p.l <= 0) return false;
        fc.strokeStyle = `rgba(${p.c},${p.l.toFixed(2)})`;
        fc.beginPath(); fc.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); fc.lineTo(p.x, p.y); fc.stroke();
        return true;
      });
      raf = requestAnimationFrame(frame);
    };
    const t = window.setTimeout(() => { raf = requestAnimationFrame(frame); }, 900);
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf); fc.clearRect(0, 0, cv.width, cv.height); };
  }, [active]);
  return <canvas ref={ref} className={s.fw} />;
}

const BAT = "M30 12q-4-8-14-8 4 4 3 8-8-4-18 0 8 2 10 8 6-4 10-2 4 2 6 10 2-8 6-10 4-2 10 2 2-6 10-8-10-4-18 0-1-4 3-8-10 0-14 8z";
const STAR_PTS = Array.from({ length: 40 }, (_, i) => {
  const r = i % 2 ? 84 : 100, a = (i * Math.PI) / 20;
  return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`;
}).join(" ");

function FestPage({ active, run, theme, code, onReplay, toast }: { active: boolean; run: number; theme: SeasonalTheme; code: string; onReplay: () => void; toast: (m: string) => void }) {
  const copy = useMemo(() => seasonalCopy(theme), [theme]);
  const [ok, setOk] = useState(false);
  const snow = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: `${(i * 3.6 + Math.random() * 3).toFixed(1)}%`, "--s": `${(2 + Math.random() * 3).toFixed(1)}px`,
    "--d": `${(5 + Math.random() * 6).toFixed(1)}s`, animationDelay: `-${(Math.random() * 9).toFixed(1)}s`,
  })), []);
  const tellText = `Come cut with me on Cutzioo! Use my code ${code} and we could both win a month of Premium free.`;
  const tell = () => {
    if (navigator.share) navigator.share({ title: "Cutzioo", text: tellText }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(tellText).then(() => toast("Message copied"));
    else toast("Sharing not supported");
  };
  const copyCode = () => {
    if (!navigator.clipboard) { toast(code); return; }
    navigator.clipboard.writeText(code).then(() => { haptic("success"); setOk(true); window.setTimeout(() => setOk(false), 1600); });
  };
  let k = 0;
  return (
    <Page active={active} run={run} className={s.fest} theme={theme}>
      <div className={s.fl} />
      <Fireworks active={active && theme === "newyear"} />
      <div className={s.moon} />
      <i className={s.bat} style={{ top: "15%" }}><svg viewBox="0 0 60 30"><path d={BAT} /></svg></i>
      <i className={s.bat} style={{ top: "27%", animationDelay: "-3s", animationDuration: "10s" }}><svg viewBox="0 0 60 30"><path d={BAT} /></svg></i>
      <div className={s.snow}>{theme === "christmas" && snow.map((st, i) => <i key={i} className={s.sn} style={v(st)} />)}</div>
      <svg className={`${s.dsc} ${s.dH}`} viewBox="0 0 430 300" preserveAspectRatio="xMidYMax slice">
        <path fill="#0b0412" d="M0 300L0 262Q110 240 215 258T430 250L430 300Z" />
        <g stroke="#0b0412" strokeWidth="8" strokeLinecap="round" fill="none"><path d="M50 272Q56 220 46 188" /><path d="M49 214L24 192M51 200L74 176M47 190L32 166" /></g>
        <g className={s.pk2}><ellipse cx="300" cy="258" rx="28" ry="21" fill="#ff7a1a" /><ellipse cx="285" cy="259" rx="14" ry="20" fill="#e8650f" /><ellipse cx="315" cy="259" rx="14" ry="20" fill="#e8650f" /><path d="M298 238q2-8 8-9" stroke="#3b7a2a" strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M285 252l6-8 6 8zM303 252l6-8 6 8z" fill="#ffd23f" /><path d="M286 264l6 5 8-5 8 5 8-5" stroke="#ffd23f" strokeWidth="3" fill="none" strokeLinejoin="round" /></g>
        <g className={s.pk2} style={{ animationDelay: "-1.2s" }}><ellipse cx="352" cy="272" rx="17" ry="13" fill="#ff7a1a" /><path d="M344 269l4-5 4 5zM354 269l4-5 4 5z" fill="#ffd23f" /></g>
      </svg>
      <svg className={`${s.dsc} ${s.dC}`} viewBox="0 0 430 300" preserveAspectRatio="xMidYMax slice">
        <path fill="#cfe3ee" d="M0 300L0 266Q110 244 215 262T430 254L430 300Z" /><path fill="#f2f8fb" d="M0 300L0 280Q120 266 230 278T430 272L430 300Z" />
        <g fill="#0d3b2a"><path d="M62 176L38 218H52L30 252H48L24 286H100L76 252H94L72 218H86Z" /><path d="M366 206L346 240H358L340 268H356L336 292H396L376 268H392L374 240H386Z" /></g>
        <circle cx="62" cy="172" r="5" fill="#ffd45e" />
        <g><circle className={s.tl} cx="52" cy="224" r="3" fill="#ff4d5a" /><circle className={s.tl} cx="72" cy="240" r="3" fill="#ffd45e" style={{ animationDelay: ".4s" }} /><circle className={s.tl} cx="46" cy="260" r="3" fill="#7fd2ff" style={{ animationDelay: ".8s" }} /><circle className={s.tl} cx="78" cy="272" r="3" fill="#ff4d5a" style={{ animationDelay: "1.1s" }} /><circle className={s.tl} cx="360" cy="248" r="3" fill="#ffd45e" style={{ animationDelay: ".3s" }} /><circle className={s.tl} cx="372" cy="270" r="3" fill="#ff4d5a" style={{ animationDelay: ".9s" }} /></g>
      </svg>
      <svg className={`${s.dsc} ${s.dN}`} viewBox="0 0 430 300" preserveAspectRatio="xMidYMax slice">
        <path fill="#060818" d="M0 300V236h24v-22h18v30h20v-52h22v42h26v-26h20v36h24v-62h26v52h22v-30h26v46h24v-38h22v42h30v-34h24V300Z" />
        <g fill="#ffd45e"><rect className={s.wd} x="48" y="222" width="3" height="4" /><rect className={s.wd} x="100" y="206" width="3" height="4" style={{ animationDelay: ".5s" }} /><rect className={s.wd} x="172" y="200" width="3" height="4" style={{ animationDelay: "1s" }} /><rect className={s.wd} x="236" y="220" width="3" height="4" style={{ animationDelay: ".3s" }} /><rect className={s.wd} x="300" y="232" width="3" height="4" style={{ animationDelay: ".8s" }} /><rect className={s.wd} x="352" y="226" width="3" height="4" style={{ animationDelay: "1.3s" }} /></g>
      </svg>
      {[["10%", "18%", ".2s"], ["86%", "22%", ".9s"], ["20%", "44%", "1.5s"], ["80%", "52%", ".5s"], ["48%", "12%", "1.2s"]].map(([l, t, d]) => (
        <i key={l + t} className={s.sps} style={{ left: l, top: t, animationDelay: d }}>✦</i>
      ))}
      <div className={s.c}>
        <div className={`${s.bulbs} ${s.dz}`} style={v({ "--i": 0 })} />
        <p className={`${s.eyebrow} ${s.dz}`} style={v({ "--i": 0 })}>{copy.eyebrow}</p>
        <h2 className={s.dh}>
          {copy.headline.map((line, li) => (
            <span key={li} className={s.ln}>
              {line.split("").map((ch, ci) => ch === " "
                ? <span key={ci} className={s.sp2}> </span>
                : <span key={ci} className={s.chr} style={v({ "--k": k++ })}>{ch}</span>)}
            </span>
          ))}
        </h2>
        <div className={`${s.badge} ${s.dz}`} style={v({ "--i": 3 })}>
          <svg className={s.bi} viewBox="0 0 200 200">
            <defs>
              <linearGradient id="recapBg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: "var(--g1)" }} /><stop offset="1" style={{ stopColor: "var(--g2)" }} /></linearGradient>
              <linearGradient id="recapBg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: "var(--h1)" }} /><stop offset="1" style={{ stopColor: "var(--h2)" }} /></linearGradient>
            </defs>
            <g className={s.spin}><polygon className={s.sb} points={STAR_PTS} fill="url(#recapBg1)" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinejoin="round" /></g>
            <circle cx="100" cy="100" r="68" fill="url(#recapBg2)" stroke="rgba(255,255,255,.7)" strokeWidth="3" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="3 5" opacity=".6" />
            <text className={s.t} x="100" y="82" textAnchor="middle" fontSize="18" fill="#fff">1 MONTH</text>
            <text className={s.t} x="100" y="124" textAnchor="middle" fontSize="46" fill="#fff">FREE</text>
            <text x="100" y="146" textAnchor="middle" fontFamily="-apple-system,Inter,sans-serif" fontWeight="600" fontSize="12" letterSpacing="2.5" fill="#fff">PREMIUM</text>
          </svg>
        </div>
        <p className={`${s.dlead} ${s.dz}`} style={v({ "--i": 4 })}>{copy.lead}</p>
        <div className={`${s.steps} ${s.dz}`} style={v({ "--i": 5 })}>
          <div><i>1</i><span>Share your code</span></div>
          <div><i>2</i><span>A friend books a cut</span></div>
          <div><i>3</i><span>You may win Premium</span></div>
        </div>
        <div className={`${s.tk2} ${s.dz}`} style={v({ "--i": 6 })}>
          <div><span>Your code</span><b>{code}</b></div>
          <button type="button" onClick={copyCode} data-ok={ok ? "" : undefined}>{ok ? "Copied ✓" : "Copy"}</button>
        </div>
        <div className={`${s.btns} ${s.dz}`} style={v({ "--i": 7 })}>
          <button type="button" className={s.b} onClick={onReplay}>Replay</button>
          <button type="button" className={s.a} onClick={tell}>Tell someone</button>
        </div>
        <p className={`${s.fine} ${s.dz}`} style={v({ "--i": 8 })}>Premium month is added to your account if you win. Terms apply.</p>
      </div>
    </Page>
  );
}

/* ---------- the recap ---------- */

export default function Recap() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<RecapMode>("week");
  const { data } = useRecapStats(mode);
  const [idx, setIdx] = useState(0);
  const [run, setRun] = useState(0);
  const [hold, setHold] = useState(false);
  const [theme, setTheme] = useState<SeasonalTheme>(() => pickSeasonalTheme());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: code = "CUTZIOO" } = useQuery({
    queryKey: ["my-referral-code"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data: c } = await (supabase as any).rpc("get_my_referral_code");
      return typeof c === "string" && c ? c : "CUTZIOO";
    },
  });

  const idxRef = useRef(0);
  const elRef = useRef(0);
  const pausedRef = useRef(false);
  const lastRef = useRef(0);
  const segs = useRef<(HTMLElement | null)[]>([]);
  const holdTimer = useRef<number | null>(null);
  const ignoreRef = useRef(false);
  const toastTimer = useRef<number | null>(null);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const show = useCallback((n: number) => {
    const next = Math.max(0, Math.min(N - 1, n));
    idxRef.current = next;
    elRef.current = 0;
    setIdx(next);
    setRun((r) => r + 1);
    segs.current.forEach((el, i) => { if (el) el.style.width = i < next ? "100%" : "0%"; });
  }, []);

  // Story clock — writes straight to the progress bars so ticking never re-renders.
  useEffect(() => {
    let raf = 0;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - lastRef.current);
      lastRef.current = now;
      if (!pausedRef.current && elRef.current < DUR) {
        elRef.current += dt;
        if (elRef.current >= DUR) {
          if (idxRef.current < N - 1) show(idxRef.current + 1);
          else elRef.current = DUR;
        }
      }
      const seg = segs.current[idxRef.current];
      if (seg) seg.style.width = `${Math.min(1, elRef.current / DUR) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  // Don't burn the first story while the numbers are still loading.
  useEffect(() => { pausedRef.current = !data || hold; }, [data, hold]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") show(idxRef.current + 1);
      else if (e.key === "ArrowLeft") show(idxRef.current - 1);
      else if (e.key === "Escape") navigate(-1);
      else if (e.key === "t" || e.key === "T") {
        setTheme((t) => { const nt = SEASONAL_THEMES[(SEASONAL_THEMES.indexOf(t) + 1) % SEASONAL_THEMES.length]; toast(`Theme: ${nt}`); return nt; });
        if (idxRef.current === N - 1) show(N - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, show, toast]);

  const onDown = (e: React.PointerEvent) => {
    ignoreRef.current = !!(e.target as Element).closest("button, a, [data-seg]");
    if (ignoreRef.current) return;
    holdTimer.current = window.setTimeout(() => setHold(true), 220);
  };
  const onUp = (e: React.PointerEvent) => {
    if (ignoreRef.current) return;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (hold) { setHold(false); return; }
    const r = e.currentTarget.getBoundingClientRect();
    haptic("selection");
    if (e.clientX - r.left < r.width * 0.3) show(idxRef.current - 1);
    else if (idxRef.current < N - 1) show(idxRef.current + 1);
  };
  const onLeave = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); setHold(false); };

  const switchMode = (m: RecapMode) => {
    if (m === mode) return;
    haptic("light");
    setMode(m);
    show(idxRef.current);
  };

  const share = () => {
    if (!data) return;
    const txt = `My ${mode} at Cutzioo: ${data.bookings} bookings, ${eur(data.revenue)} revenue, ${data.newClients} new clients${data.rating ? `, ${data.rating}★` : ""}.`;
    if (navigator.share) navigator.share({ title: "Cutzioo recap", text: txt }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("Copied to clipboard"));
    else toast("Sharing not supported");
  };

  const blobTheme = THEMES[PAGE_THEME[idx] ?? 0];
  const D: RecapStats | undefined = data;
  const max = D ? Math.max(1, ...D.bars) : 1;
  const pct = D ? Math.min(1, D.revenue / Math.max(1, D.goal)) : 0;
  const act = (n: number) => idx === n;

  return (
    <div className={s.stage}>
      <div className={s.app} data-hold={hold ? "" : undefined} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onLeave} onPointerCancel={onLeave}>
        <div className={s.bg}>
          {blobTheme.c.map((c, i) => (
            <div key={i} className={s.bl} style={{ backgroundColor: c, transform: `translate(${blobTheme.p[i][0]}%,${blobTheme.p[i][1]}%)` }}><b /></div>
          ))}
        </div>

        <header className={s.header}>
          <div className={s.prog}>
            {Array.from({ length: N }, (_, i) => <i key={i}><b ref={(el) => { segs.current[i] = el; }} /></i>)}
          </div>
          <div className={s.bar}>
            <div className={s.brand}><Logo />Recap</div>
            <div className={s.seg} data-seg="" data-month={mode === "month" ? "" : undefined}>
              <i />
              <button type="button" data-on={mode === "week" ? "" : undefined} onClick={() => switchMode("week")}>Week</button>
              <button type="button" data-on={mode === "month" ? "" : undefined} onClick={() => switchMode("month")}>Month</button>
            </div>
            <button type="button" className={s.exit} aria-label="Close recap" onClick={() => navigate(-1)}><X size={16} /></button>
          </div>
        </header>

        {/* 0 — intro */}
        <Page active={act(0)} run={run}>
          <div className={s.c}>
            <Logo className={`${s.logo} ${s.rise}`} draw />
            <p className={`${s.eyebrow} ${s.rise}`} style={v({ "--i": 1 })}>{D?.range ?? "Loading your numbers…"}</p>
            <h1 className={`${s.title} ${s.tx}`}>
              <span className={s.w} style={v({ "--k": 0 })}>Your</span>{" "}
              <span className={s.w} style={v({ "--k": 1 })}><span className={s.per}>{mode}</span>,</span><br />
              <span className={s.w} style={v({ "--k": 2 })}>wrapped.</span>
            </h1>
            <p className={`${s.sub} ${s.rise}`} style={v({ "--i": 14 })}>Tap to continue · hold to pause</p>
          </div>
        </Page>

        {/* 1 — bookings */}
        <Page active={act(1)} run={run}>
          <div className={s.c}>
            <p className={`${s.eyebrow} ${s.rise}`}>Bookings</p>
            <div className={`${s.big} ${s.rise}`} style={v({ "--i": 1 })}>{D && <Count to={D.bookings} run={run} />}</div>
            <p className={`${s.lead} ${s.rise}`} style={v({ "--i": 2 })}>
              {D?.bookings === 0 ? `No appointments ${D.period} yet — your next one starts the story.` : `appointments ${D?.period ?? ""}.`}
            </p>
            {D?.delta != null && (
              <span className={`${s.pill} ${s.rise}`} style={v({ "--i": 3 })}>{D.delta >= 0 ? "↑" : "↓"} {Math.abs(D.delta)}% vs {D.prev}</span>
            )}
            <div className={`${s.glass} ${s.rise}`} style={v({ "--i": 4 })}>
              <div className={s.bars}>
                {D?.bars.map((val, i) => (
                  <div key={i} className={s.col} data-pk={val === max && val > 0 ? "" : undefined}>
                    <i style={v({ "--h": `${(val / max) * 100}%`, "--d": `${i * 70}ms` })} />
                    <em>{D.labels[i]}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Page>

        {/* 2 — busiest */}
        <Page active={act(2)} run={run}>
          <div className={s.c}>
            <p className={`${s.eyebrow} ${s.rise}`}>Busiest time</p>
            <h2 className={`${s.h2} ${s.rise}`} style={v({ "--i": 1 })}>{D?.peakDay}<br />at {D?.peakTime}</h2>
            <p className={`${s.lead} ${s.rise}`} style={v({ "--i": 2 })}>That's when your chairs were fullest.</p>
            <div className={`${s.glass} ${s.rise}`} style={v({ "--i": 3 })}>
              <div className={s.heat}>
                <span />
                {HEAT_DAYS.map((d) => <span key={d}>{d}</span>)}
                {D?.heat.map((row, ri) => (
                  <RowCells key={ri} row={row} ri={ri} />
                ))}
              </div>
            </div>
          </div>
        </Page>

        {/* 3 — top clients */}
        <Page active={act(3)} run={run}>
          <div className={s.c}>
            <p className={`${s.eyebrow} ${s.rise}`}>Top client</p>
            <h2 className={`${s.h2} ${s.rise}`} style={v({ "--i": 1 })}>{D?.topClients[0]?.name ?? "Nobody yet"}</h2>
            <p className={`${s.lead} ${s.rise}`} style={v({ "--i": 2 })}>
              {D?.topClients[0] ? `${D.topClients[0].count} booking${D.topClients[0].count === 1 ? "" : "s"} ${D.period} — ${D.topClientShare}% of everything.` : `Your regulars will show up here.`}
            </p>
            <div className={`${s.glass} ${s.rise}`} style={v({ "--i": 3 })}>
              <div className={s.clients}>
                {D?.topClients.map((c, i) => (
                  <div key={c.name + i} className={s.client}>
                    <span className={s.av}>{c.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                    <span className={s.nm}>{c.name}</span>
                    <span className={s.ct}>{c.count}×</span>
                  </div>
                ))}
                {D && D.topClients.length === 0 && <p className={s.empty}>No clients {D.period}</p>}
              </div>
            </div>
            {D && (
              <div className={`${s.chips} ${s.rise}`} style={v({ "--i": 4 })}>
                <div className={s.glass}><b><Count to={D.returning} delay={700} run={run} /></b><span>Returning</span></div>
                <div className={s.glass}><b><Count to={D.newClients} delay={820} run={run} /></b><span>New</span></div>
                <div className={s.glass}><b><Count to={D.completed} delay={940} run={run} /></b><span>Completed</span></div>
              </div>
            )}
          </div>
        </Page>

        {/* 4 — revenue */}
        <Page active={act(4)} run={run}>
          <div className={s.c}>
            <p className={`${s.eyebrow} ${s.rise}`}>Revenue</p>
            <div className={`${s.ringw} ${s.rise}`} style={v({ "--i": 1 })}>
              <svg viewBox="0 0 200 200">
                <defs><linearGradient id="recapRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a1a" /><stop offset="1" stopColor="#ff3d71" /></linearGradient></defs>
                <circle className={s.rt} cx="100" cy="100" r="88" />
                <circle className={s.rp} cx="100" cy="100" r="88" style={v({ "--off": (553 * (1 - pct)).toFixed(1) })} />
              </svg>
              <div className={s.rc}>
                <b>{D && <Count to={D.revenue} pre="€" run={run} />}</b>
                <span>{D ? `of ${eur(D.goal)} goal · ${Math.round(pct * 100)}%` : ""}</span>
              </div>
            </div>
            {D && (
              <div className={`${s.mini} ${s.rise}`} style={v({ "--i": 3 })}>
                <div className={s.glass}><b><Count to={D.avgTicket} pre="€" run={run} /></b><span>Avg. ticket</span></div>
                <div className={s.glass}><b><Count to={D.returning} run={run} /></b><span>Returning</span></div>
                <div className={s.glass}><b><Count to={D.newClients} pre="+" run={run} /></b><span>New clients</span></div>
              </div>
            )}
          </div>
        </Page>

        {/* 5 — services */}
        <Page active={act(5)} run={run}>
          <div className={s.c}>
            <p className={`${s.eyebrow} ${s.rise}`}>Top services</p>
            <div className={s.rise} style={v({ "--i": 1 })}>
              {D?.services.map((sv, i) => (
                <div key={sv.name} className={s.sv}>
                  <div className={s.t}><span>{sv.name}</span><b><Count to={sv.pct} suf="%" delay={550 + i * 120} run={run} /></b></div>
                  <div className={s.tr}><i style={v({ "--w": `${sv.pct}%`, "--d": `${i * 120}ms` })} /></div>
                </div>
              ))}
              {D && D.services.length === 0 && <p className={s.empty}>No services booked {D.period}</p>}
            </div>
            <div className={`${s.glass} ${s.rate} ${s.rise}`} style={v({ "--i": 2 })}>
              <div>
                <b>{D?.rating != null ? <Count to={D.rating} dec={1} run={run} /> : "—"}</b>
                <p className={s.sub}>{D?.reviews ? `from ${D.reviews} review${D.reviews === 1 ? "" : "s"}` : "no reviews yet"}</p>
              </div>
              <div className={s.stars}>{[0, 1, 2, 3, 4].map((i) => <s key={i} style={v({ "--i": i, opacity: D?.rating != null && i < Math.round(D.rating) ? undefined : 0.25 })}>★</s>)}</div>
            </div>
          </div>
        </Page>

        {/* 6 — summary */}
        <Page active={act(6)} run={run}>
          <div className={s.c}>
            <div className={`${s.glass} ${s.card} ${s.rise}`}>
              <div className={s.ch}><Logo /><div><b>Your {mode} at Cutzioo</b><span>{D?.range}</span></div></div>
              {D && (
                <div className={s.grid}>
                  <div><b><Count to={D.bookings} run={run} /></b><span>Bookings</span></div>
                  <div><b><Count to={D.revenue} pre="€" run={run} /></b><span>Revenue</span></div>
                  <div><b><Count to={D.newClients} run={run} /></b><span>New clients</span></div>
                  <div><b>{D.rating != null ? <Count to={D.rating} dec={1} run={run} /> : "—"}</b><span>Rating</span></div>
                </div>
              )}
              {D && (
                <p className={s.foot}>
                  Busiest: {D.peakDay} at {D.peakTime}<br />
                  Top client: {D.topClients[0]?.name ?? "—"} · Top service: {D.topService}<br />
                  {D.delta != null ? `${D.delta >= 0 ? "↑" : "↓"} ${Math.abs(D.delta)}% bookings vs ${D.prev}` : `First ${mode} on record`}
                </p>
              )}
            </div>
            <div className={`${s.btns} ${s.rise}`} style={v({ "--i": 2 })}>
              <button type="button" className={s.b} onClick={() => show(0)}>Replay</button>
              <button type="button" className={s.a} onClick={share}>Share</button>
            </div>
          </div>
        </Page>

        {/* 7 — seasonal invite */}
        <FestPage active={act(7)} run={run} theme={theme} code={code} onReplay={() => show(0)} toast={toast} />

        <div className={s.toast} data-on={toastMsg ? "" : undefined}>{toastMsg}</div>
      </div>
    </div>
  );
}

function RowCells({ row, ri }: { row: number[]; ri: number }) {
  const peak = Math.max(...row);
  return (
    <>
      <span>{HEAT_HOURS[ri]}</span>
      {row.map((val, ci) => (
        <i key={ci} className={s.hc} data-pk={val === 1 && peak === 1 ? "" : undefined} style={v({ "--o": (0.14 + val * 0.86).toFixed(2), "--d": `${ri * 45 + ci * 60}ms` })} />
      ))}
    </>
  );
}
