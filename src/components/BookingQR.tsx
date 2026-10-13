import { useEffect, useRef, useState } from "react";
import { QrCode, Share2, Download, Copy, Expand } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { generateBookingFlyer } from "@/lib/generateBookingFlyer";
import BookingQR3D from "@/lib/booking-qr-3d";
import CandyButton from "@/components/ui/candy-button";

interface BookingQRProps {
  url: string;
  businessName?: string | null;
  isPremium: boolean;
}

// The shopfront reveal is a one-shot moment: it plays the first time the user
// asks for their QR on this page load, then never again until they refresh.
const playedReveal = new Set<string>();

// Short ascending chime when the QR code lands.
function playQrChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [659.25, 830.61, 987.77, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.09;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1400);
  } catch {
    /* audio blocked until a user gesture */
  }
}

// Distinct "QR landed" pulse: tap-tap, then one long thump.
function qrHaptic() {
  try {
    (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean })
      .vibrate?.([16, 40, 16, 40, 140]);
  } catch {
    /* no vibration API */
  }
}

export function BookingQR({ url, businessName, isPremium }: BookingQRProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sceneRef = useRef<any>(null);

  const displayName = businessName?.trim() || "Cutzioo";

  // Permanent, offline QR — rendered locally once per link, so it always
  // scans and never depends on an external image API.
  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(url, { errorCorrectionLevel: "M", width: 1024, margin: 2 })
      .then((data) => { if (!cancelled) setQrDataUrl(data); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    return () => {
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
    };
  }, []);

  const ensureScene = () => {
    if (!sceneRef.current) {
      sceneRef.current = new BookingQR3D({
        url,
        name: displayName,
        title: "Scan to book",
        readyTitle: "Preparing your code",
        theme: "auto",
        onDone: () => {
          playQrChime();
          qrHaptic();
        },
      });
    }
    return sceneRef.current;
  };

  // First press plays the full reveal; every later press jumps straight to
  // the finished code — the animation never replays until a page refresh.
  const showQr = () => {
    if (!url) return;
    haptic("medium");
    setRevealed(true);
    const scene = ensureScene();
    scene.setUrl(url);
    if (playedReveal.has(url)) {
      scene.showFinal();
    } else {
      playedReveal.add(url);
      scene.open();
    }
  };

  const qrBlob = async (): Promise<Blob> => {
    if (!qrDataUrl) throw new Error("QR not ready");
    return (await fetch(qrDataUrl)).blob();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const flyerFilename = () =>
    `qr-${displayName.toLowerCase().replace(/\s+/g, "-")}.png`;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const flyer = await generateBookingFlyer(await qrBlob(), displayName);
      downloadBlob(flyer, flyerFilename());
    } catch {
      toast({ title: "Couldn't create flyer", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const flyer = await generateBookingFlyer(await qrBlob(), displayName);
      const file = new File([flyer], flyerFilename(), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Book with ${displayName}`,
            text: `Scan to book with ${displayName}`,
            files: [file],
          });
        } catch {
          /* cancelled */
        }
      } else {
        downloadBlob(flyer, flyerFilename());
      }
    } catch {
      toast({ title: "Couldn't create flyer", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      haptic("selection");
      toast({ title: "Booking link copied" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
        <p className="text-white font-medium">QR flyer is a premium feature</p>
        <p className="text-sm text-white/50 mt-1">
          Upgrade to download and share your scannable booking code.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Book with
        </p>
        <h3 className="text-xl font-semibold text-white mt-1">{displayName}</h3>
      </div>

      {revealed && qrDataUrl && (
        <div className="space-y-2">
          <div className="mx-auto w-fit rounded-[24px] bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <img
              src={qrDataUrl}
              alt={`QR code that opens ${url}`}
              className="h-48 w-48 sm:h-56 sm:w-56"
            />
          </div>
          <p className="text-[13px] text-white/50 break-all">
            Scan to book · {url.replace(/^https?:\/\//, "")}
          </p>
        </div>
      )}

      <CandyButton
        variant="ruby"
        size="lg"
        className="w-full max-w-[16rem]"
        leftIcon={revealed ? <Expand /> : <QrCode />}
        onClick={showQr}
        disabled={!url}
      >
        {url ? (revealed ? "Show QR" : "Give me my QR") : "Save a slug first"}
      </CandyButton>

      {qrDataUrl && (
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-white/[0.1] active:scale-[0.98] transition"
          >
            <Copy className="h-4 w-4" /> Copy link
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-white/[0.1] active:scale-[0.98] transition disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export QR
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={exporting}
            className="h-11 px-4 rounded-xl bg-rose-500 text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-rose-600 active:scale-[0.98] transition disabled:opacity-40"
          >
            <Share2 className="h-4 w-4" /> Share flyer
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pt-1">
        <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-5 w-5 rounded-md" />
        <span className="text-xs text-white/30">Powered by cutzioo.com</span>
      </div>
    </div>
  );
}
