"use client";
/** A number that lights up for a moment when it changes, so a live refresh shows what moved. */
import { useEffect, useRef, useState } from "react";

export function Flash({ value, children, className = "" }: { value: string | number; children: React.ReactNode; className?: string }) {
  const previous = useRef(value);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setLit(true);
    const t = setTimeout(() => setLit(false), 1600);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={`${className} rounded-md transition-colors duration-700 ${lit ? "bg-accent-soft text-accent-text" : ""}`}>{children}</span>;
}
