import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './debug-env'; // Debug env vars
import App from './App.tsx';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import './index.css';
import { initNativeShell } from './lib/native';

createRoot(document.getElementById("root")!).render(
  <HelmetProvider><App /></HelmetProvider>
);

void initNativeShell();


// Best-effort: register the push service worker on boot
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
