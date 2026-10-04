"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades its content up the first time it scrolls into view. Print and reduced motion show it at once (globals.css). */
export function Reveal({ children, className = "", as: Tag = "div", id }: { children: React.ReactNode; className?: string; as?: "div" | "section"; id?: string }) {
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

  return <Tag ref={ref} id={id} className={`reveal ${seen ? "in" : ""} ${className}`}>{children}</Tag>;
}

/**
 * Counts up to the value once, keeping its decimals. The real value is what a screen reader and print get.
 * `whenSeen` holds the count until the number scrolls into view, for figures further down a page.
 */
export function CountUp({ value, duration = 1400, whenSeen = false }: { value: number; duration?: number; whenSeen?: boolean }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const decimals = Number.isInteger(value) ? 0 : 1;

  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setShown(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const node = ref.current;
    if (!whenSeen || !node || typeof IntersectionObserver === "undefined") { run(); return () => cancelAnimationFrame(frame); }
    setShown(0);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); run(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, duration, whenSeen]);

  return (
    <>
      <span ref={ref} aria-hidden data-countup={value} className="print:hidden">{shown.toFixed(decimals)}</span>
      <span className="sr-only print:not-sr-only">{value}</span>
    </>
  );
}

/** How far the page has been read: a line of light along the top of the screen (globals.css: .scroll-progress). */
export function ScrollProgress() {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${room > 0 ? Math.min(1, window.scrollY / room) : 0})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return <span ref={bar} className="scroll-progress no-print" aria-hidden />;
}

/** A soft light that follows the pointer, under the page (globals.css: .cursor-glow). Only where there is a pointer to follow. */
export function CursorGlow() {
  const glow = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0, x = 0, y = 0;
    const place = () => {
      frame = 0;
      if (!glow.current) return;
      glow.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      glow.current.style.opacity = "1";
    };
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!frame) frame = requestAnimationFrame(place); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(frame); };
  }, []);
  return <span ref={glow} className="cursor-glow no-print" aria-hidden />;
}

/** A panel that leans toward the pointer and carries a spot of light under it (globals.css: .tilt). A mouse only: a finger scrolls. */
export function Tilt({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const move = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const node = e.currentTarget, box = node.getBoundingClientRect();
    node.style.setProperty("--px", ((e.clientX - box.left) / box.width).toFixed(3));
    node.style.setProperty("--py", ((e.clientY - box.top) / box.height).toFixed(3));
    node.dataset.lit = "";
  };
  const leave = (e: React.PointerEvent<HTMLElement>) => {
    const node = e.currentTarget;
    node.style.removeProperty("--px");
    node.style.removeProperty("--py");
    delete node.dataset.lit;
  };
  return <Tag className={`tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>{children}</Tag>;
}
