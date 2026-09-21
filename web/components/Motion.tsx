"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades its content up the first time it scrolls into view. Print and reduced motion show it at once (globals.css). */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return setSeen(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); observer.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <Tag ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`}>{children}</Tag>;
}

/** Counts up to the value once, keeping its decimals. The real value is what a screen reader and print get. */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const decimals = Number.isInteger(value) ? 0 : 1;

  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden className="print:hidden">{shown.toFixed(decimals)}</span>
      <span className="sr-only print:not-sr-only">{value}</span>
    </>
  );
}
