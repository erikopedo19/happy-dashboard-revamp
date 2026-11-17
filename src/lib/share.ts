/** Sharing that works in browsers, the installed PWA, Capacitor and the Expo WebView shell. */
import { isNative } from "@/lib/native";

export type SharePayload = { title?: string; text?: string; url: string };
export type SharePlatform = "whatsapp" | "telegram" | "facebook" | "x" | "sms" | "email";

const inExpoShell = () => typeof window !== "undefined" && !!(window as any).ReactNativeWebView;

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** System share sheet by whichever route this runtime has; copies `fallback` when there is none. */
async function systemShare(data: { title?: string; text?: string; url?: string }, fallback: string): Promise<ShareResult> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ ...data, dialogTitle: data.title });
      return "shared";
    } catch (e) {
      if (/cancel/i.test(String((e as Error)?.message))) return "cancelled";
    }
  }
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
      /* NotAllowedError etc. — fall back to copying */
    }
  } else if (inExpoShell()) {
    // Android WebView has no Web Share API; the shell opens the native sheet (older shells ignore this and keep the copy).
    (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: "cutzio-share", ...data }));
  }
  return (await copyText(fallback)) ? "copied" : "failed";
}

/** Opens the system share sheet when there is one, otherwise copies the link. */
export async function shareLink({ title, text, url }: SharePayload): Promise<ShareResult> {
  if (!url) return "failed";
  return systemShare({ title, text, url }, url);
}

/** Shares plain text (a message, a CSV) the same way. */
export async function shareText(text: string, title?: string): Promise<ShareResult> {
  return systemShare({ title, text }, text);
}

/** True inside the Capacitor or Expo app, where a browser-style file download goes nowhere. */
export const inAppShell = () => isNative() || inExpoShell();

export function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}

/** Shares a file through the share sheet; downloads it where files can't be shared. */
export async function shareFile(
  blob: Blob,
  filename: string,
  meta: { title?: string; text?: string } = {},
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ ...meta, files: [file] });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

export function platformShareUrl(platform: SharePlatform, { title, text, url }: SharePayload) {
  const u = encodeURIComponent(url);
  const line = encodeURIComponent([text, url].filter(Boolean).join(" "));
  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${line}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${encodeURIComponent(text || "")}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text || "")}&url=${u}`;
    case "sms":
      return `sms:?&body=${line}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent(title || "")}&body=${line}`;
  }
}

/** The Expo shell hands non-app URLs to the system; elsewhere a new tab keeps the app open. */
export function openExternal(url: string) {
  if (inExpoShell() || /^(sms|mailto|tel):/.test(url)) {
    window.location.href = url;
    return;
  }
  // No "noopener" feature string: it makes window.open return null even on success.
  const win = window.open(url, "_blank");
  if (win) win.opener = null;
  else window.location.href = url;
}
