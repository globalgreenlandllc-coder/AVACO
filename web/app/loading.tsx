/** Shown while a page's data is on its way: the brand, breathing, and nothing else to read into. */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <div className="relative grid h-16 w-16 place-items-center">
        <span className="breathe absolute inset-0 rounded-full bg-accent" aria-hidden />
        <span className="relative font-display text-xl font-semibold tracking-[0.18em] text-accent-ink">A</span>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
