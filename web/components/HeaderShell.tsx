"use client";

import { useEffect, useState } from "react";

/** The sticky header's frame: it grows a hairline and a shadow once the page has scrolled under it. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <div className="site-header no-print" data-scrolled={scrolled}>{children}</div>;
}
