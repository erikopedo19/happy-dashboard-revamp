import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "cutzio:rq-cache:v2";
const MAX_AGE = 1000 * 60 * 60 * 24;
const MAX_BYTES = 2_500_000;

// Only plain JSON survives a localStorage round-trip — Sets, Maps, Dates or
// class instances would come back as different shapes and crash consumers.
function isPlainJson(v: unknown, depth = 0): boolean {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return true;
  if (depth > 12 || typeof v !== "object") return false;
  if (Array.isArray(v)) return v.every((x) => isPlainJson(x, depth + 1));
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(v as Record<string, unknown>).every((x) => x === undefined || isPlainJson(x, depth + 1));
}

/**
 * Persists successful React Query results to localStorage so pages render
 * instantly from cache on the next app launch, then refresh in the background.
 * Cleared on sign-out so cached data never leaks between accounts.
 */
export function setupQueryPersistence(qc: QueryClient) {
  localStorage.removeItem("cutzio:rq-cache:v1");
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const { t, state } = JSON.parse(raw);
      if (Date.now() - t < MAX_AGE) hydrate(qc, state);
      else localStorage.removeItem(KEY);
    }
  } catch {
    localStorage.removeItem(KEY);
  }

  let timer: number | undefined;
  const save = () => {
    window.clearTimeout(timer);
    try {
      const state = dehydrate(qc, { shouldDehydrateQuery: (q) => q.state.status === "success" && isPlainJson(q.state.data) });
      const json = JSON.stringify({ t: Date.now(), state });
      if (json.length > MAX_BYTES) return;
      localStorage.setItem(KEY, json);
    } catch {
      localStorage.removeItem(KEY);
    }
  };

  qc.getQueryCache().subscribe((e) => {
    if (e.type !== "updated" || e.action.type !== "success") return;
    window.clearTimeout(timer);
    timer = window.setTimeout(save, 1500);
  });
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      window.clearTimeout(timer);
      localStorage.removeItem(KEY);
      qc.clear();
    }
  });
}
