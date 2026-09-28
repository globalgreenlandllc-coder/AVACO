"use client";

import { useEffect } from "react";

/**
 * Scrolls to the section named in the address (/#gift) once the page is ready, and again when the address changes.
 * The browser's own jump to an anchor is lost on the landing page while it hydrates, so this repeats it.
 */
export function ScrollToHash() {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    const soon = setTimeout(go, 50), later = setTimeout(go, 700);
    window.addEventListener("hashchange", go);
    return () => { clearTimeout(soon); clearTimeout(later); window.removeEventListener("hashchange", go); };
  }, []);
  return null;
}
