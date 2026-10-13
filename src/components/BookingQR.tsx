import { useEffect, useRef, useState } from "react";
import { QrCode, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateBookingFlyer } from "@/lib/generateBookingFlyer";
import BookingQR3D from "@/lib/booking-qr-3d";

interface BookingQRProps {
  url: string;
  businessName?: string | null;
  isPremium: boolean;
}

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
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);
  const sceneRef = useRef<any>(null);

  const displayName = businessName?.trim() || "Cutzioo";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}`;

  const showQr = () => {
    if (!url) return;
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
    sceneRef.current.setUrl(url);
    sceneRef.current.open();
  };

  useEffect(() => {
    return () => {
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isPremium || !url) return;
    let cancelled = false;
    fetch(qrApiUrl)
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) setQrBlob(blob);
      })
      .catch(() => setQrBlob(null));
    return () => { cancelled = true; };
  }, [url, isPremium, qrApiUrl]);

  // Full-screen reveal plays each time the QR tab is opened.
  useEffect(() => {
    if (isPremium && url) showQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, url]);

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


  const handleShare = async () => {
    if (!qrBlob) return;
    try {
      const flyer = await generateBookingFlyer(qrBlob, displayName);
      const filename = `qr-${displayName.toLowerCase().replace(/\s+/g, "-")}.png`;
      const file = new File([flyer], filename, { type: "image/png" });
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
        downloadBlob(flyer, filename);
      }
    } catch {
      toast({ title: "Couldn't create flyer", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        Book with
      </p>
      <h3 className="text-xl font-semibold text-white -mt-2">{displayName}</h3>

      <button
        type="button"
        onClick={showQr}
        disabled={!url}
        className="mx-auto flex h-14 w-full max-w-[16rem] items-center justify-center gap-2.5 rounded-2xl bg-white text-[15px] font-semibold text-[#1C1C1E] transition active:scale-[0.98] disabled:opacity-40"
      >
        <QrCode className="h-5 w-5" />
        {url ? "Show QR code" : "Save a slug first"}
      </button>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleShare}
          disabled={!qrBlob}
          className="h-11 px-4 rounded-xl bg-rose-500 text-white text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-40 active:scale-[0.98] transition"
        >
          <Share2 className="h-4 w-4" /> Share flyer
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-5 w-5 rounded-md" />
        <span className="text-xs text-white/30">Powered by cutzioo.com</span>
      </div>
    </div>
  );
}
