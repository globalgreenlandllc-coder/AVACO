"use client";

/** A submit button that asks first. For deletes inside a server-action form. */
export function ConfirmSubmit({ label, confirm, className = "btn btn-quiet btn-danger" }: { label: string; confirm: string; className?: string }) {
  return <button type="submit" className={className} onClick={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }}>{label}</button>;
}
