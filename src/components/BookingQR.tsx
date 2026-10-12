import { useEffect, useState } from "react";
import { Check, QrCode, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QrReveal } from "@/components/QrReveal";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);

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

  // Full-screen reveal plays each time the QR tab is opened.
  useEffect(() => {
    if (isPremium && url) {
      setRevealed(false);
      setOpen(true);
    }
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
    <>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Book with
        </p>
        <h3 className="text-xl font-semibold text-white -mt-2">{displayName}</h3>

        <button
          type="button"
          onClick={() => url && setOpen(true)}
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

      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        <DrawerContent className="mt-0 h-[100dvh] max-h-[100dvh] rounded-t-[28px] bg-[#0B0B0F] px-6 pb-[calc(env(safe-area-inset-bottom)+28px)]">
          <DrawerTitle className="sr-only">Booking QR code for {displayName}</DrawerTitle>
          <DrawerClose className="absolute right-5 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition active:scale-90">
            <X className="h-5 w-5" />
          </DrawerClose>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 pt-6">
            <div className="space-y-1 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Book with
              </p>
              <h3 className="text-2xl font-semibold text-white">{displayName}</h3>
            </div>

            {url && (
              <div className="w-[min(84vw,380px)] space-y-4">
                <QrReveal
                  url={url}
                  businessName={displayName}
                  onDone={() => setRevealed(true)}
                  className="shadow-[0_24px_60px_-16px_rgba(0,0,0,0.65)]"
                />
                <p
                  className={cn(
                    "mx-auto flex w-fit items-center gap-1.5 rounded-full bg-[#A3E635]/15 px-3 py-1 text-[12px] font-semibold text-[#A3E635] transition-all duration-300",
                    revealed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  )}
                >
                  <Check className="h-3.5 w-3.5" /> Ready to scan · tap to replay
                </p>
              </div>
            )}

            <button
              onClick={handleShare}
              disabled={!qrBlob}
              className="h-12 px-6 rounded-2xl bg-rose-500 text-white text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-40 active:scale-[0.98] transition"
            >
              <Share2 className="h-4 w-4" /> Share flyer
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
