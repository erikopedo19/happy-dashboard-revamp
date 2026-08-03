"use client";

import { useEffect, useState } from "react";
import { Smartphone, Download, Share, MoreVertical } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa_install_dismissed_at";

export function PWAInstallDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) {
        setDismissed(true);
        return;
      }
    } catch { /* ignore */ }
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) return;
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    } else {
      setIsOpen(true);
    }
  };

  if (!platform || dismissed) return null;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full h-12 rounded-full bg-white text-black font-semibold shadow-lg flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" /> Install app
        </Button>
      </div>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Install Cutzioo</DrawerTitle>
          <DrawerDescription>
            Add this app to your home screen for quick access.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 py-2 space-y-4">
          {platform === "ios" ? (
            <ol className="list-decimal list-inside text-sm text-[#1C1C1E]/80 dark:text-white/80 space-y-2">
              <li>
                Tap the <Share className="inline w-4 h-4 mx-1 align-text-bottom" /> Share button in Safari.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top-right corner.
              </li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside text-sm text-[#1C1C1E]/80 dark:text-white/80 space-y-2">
              <li>
                Tap the <MoreVertical className="inline w-4 h-4 mx-1 align-text-bottom" /> menu in Chrome.
              </li>
              <li>
                Tap <strong>Add to Home Screen</strong> or <strong>Install app</strong>.
              </li>
              <li>Follow the prompt to install.</li>
            </ol>
          )}
          {platform === "android" && deferredPrompt && (
            <Button
              type="button"
              onClick={handleInstall}
              className="w-full h-12 rounded-full bg-white text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" /> Install now
            </Button>
          )}
        </div>
        <DrawerFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
              setIsOpen(false);
              setDismissed(true);
            }}
            className="w-full border-black/10 dark:border-white/10 text-[#1C1C1E] dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
          >
            Maybe later
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
