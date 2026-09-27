/**
 * The capsules of AVOCO's printed cover, drifting behind a .cover's content, as on the report's cover. They take the
 * cover's own --cover-gold. On phones the small bottom one would sit behind the last line of text, so it shows from sm up.
 */
export function CoverCapsules() {
  return (
    <>
      <span className="cover-capsule drift" style={{ top: -90, right: "5%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
      <span className="cover-capsule drift hidden sm:block" style={{ top: -90, right: "5%", width: 44, height: 190, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-3s" }} aria-hidden />
      <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 120, height: 290, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)", animationDelay: "-5s" }} aria-hidden />
      <span className="cover-capsule drift hidden sm:block" style={{ bottom: -90, left: "47%", width: 44, height: 150, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-7s" }} aria-hidden />
    </>
  );
}
