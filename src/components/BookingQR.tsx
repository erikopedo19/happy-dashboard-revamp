import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateBookingFlyer } from "@/lib/generateBookingFlyer";

interface BookingQRProps {
  url: string;
  businessName?: string | null;
  isPremium: boolean;
}

export function BookingQR({ url, businessName, isPremium }: BookingQRProps) {
  const { toast } = useToast();
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);

  const displayName = businessName?.trim() || "Cutzioo";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}`;

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

  const handleDownload = () => {
    if (!qrBlob) return;
    downloadBlob(
      qrBlob,
      `cutzioo-qr-${displayName.toLowerCase().replace(/\s+/g, "-")}.png`
    );
  };

  const handleShare = async () => {
    if (!qrBlob) return;
    try {
      const flyer = await generateBookingFlyer(qrBlob, displayName);
      const filename = `cutzioo-flyer-${displayName.toLowerCase().replace(/\s+/g, "-")}.png`;
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        Book with
      </p>
      <h3 className="text-xl font-semibold text-white -mt-3">{displayName}</h3>

      {url ? (
        <img
          src={qrApiUrl}
          alt="Booking QR code"
          className="mx-auto h-56 w-56 rounded-2xl bg-white p-2 object-contain"
        />
      ) : (
        <div className="mx-auto h-56 w-56 rounded-2xl bg-white/[0.06] flex items-center justify-center text-white/40 text-sm">
          Save a slug first
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={!qrBlob}
          className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-40 active:scale-[0.98] transition"
        >
          <Download className="h-4 w-4" /> Download
        </button>
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
