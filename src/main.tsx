import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import './index.css';
import { initNativeShell } from './lib/native';
import { initNativePush } from './lib/nativePush';

// Recover from stale chunks after a new deploy: reload once instead of a blank screen.
const CHUNK_RELOAD_KEY = "chunk-reload-at";
function reloadForStaleChunk() {
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - last < 10_000) return; // avoid reload loops
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
}
const isChunkError = (msg: unknown) =>
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
    String((msg as { message?: string })?.message ?? msg ?? "")
  );
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadForStaleChunk();
});
window.addEventListener("unhandledrejection", (e) => {
  if (isChunkError(e.reason)) reloadForStaleChunk();
});
window.addEventListener("error", (e) => {
  if (isChunkError(e.message || e.error)) reloadForStaleChunk();
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider><App /></HelmetProvider>
);

void initNativeShell();
initNativePush();


// Best-effort: register the push service worker on boot
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
