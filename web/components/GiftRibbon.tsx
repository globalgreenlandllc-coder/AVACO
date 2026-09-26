/** A gift box with a ribbon, in AVOCO gold on the cover's dark ground. Decorative; the words around it carry the meaning. */
export function GiftRibbon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden className="shrink-0">
      <rect width="96" height="96" rx="24" fill="var(--cover-bg)" />
      <rect x="20" y="42" width="56" height="34" rx="5" fill="var(--cover-gold)" opacity="0.9" />
      <rect x="16" y="32" width="64" height="14" rx="4" fill="var(--cover-gold)" />
      <rect x="44" y="32" width="8" height="44" fill="var(--cover-bg)" opacity="0.55" />
      <path d="M48 32c-6-10-16-13-19-8s4 9 19 8zM48 32c6-10 16-13 19-8s-4 9-19 8z" fill="none" stroke="var(--cover-gold)" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="48" cy="32" r="3.5" fill="var(--cover-gold)" />
    </svg>
  );
}
