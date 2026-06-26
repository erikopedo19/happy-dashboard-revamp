import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlimm } from "glimm/react";

/**
 * Intercepts same-origin link clicks and routes them through a glimm sweep
 * before handing off to react-router. Opt out with data-glimm-skip on the
 * anchor (or any ancestor).
 */
export function GlimmIntercept() {
  const navigate = useNavigate();
  const { sweep } = useGlimm();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.closest("[data-glimm-skip]")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      const dest = url.pathname + url.search + url.hash;
      sweep(() => navigate(dest));
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate, sweep]);

  // Fallback: play a sweep on any programmatic route change so navigations
  // triggered by code (navigate(), <Navigate>, redirects) also feel animated.
  const location = useLocation();
  const lastPath = useRef(location.pathname + location.search);
  useEffect(() => {
    const current = location.pathname + location.search;
    if (current === lastPath.current) return;
    lastPath.current = current;
    sweep(() => {}, { sweepMs: 850, outroMs: 500 });
  }, [location.pathname, location.search, sweep]);

  return null;
}

export default GlimmIntercept;
