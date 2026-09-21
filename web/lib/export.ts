/**
 * The downloaded copy of a report: one HTML file that looks and behaves like the page. It carries the
 * page's own styles, the fonts in use (embedded, so it works offline) and LIVE_SCRIPT, which repeats in
 * plain JavaScript what React does on the site: chapter pills, opening a row, the radar's hover, the
 * count-up and the scroll reveal. The components mark their parts with data attributes for it.
 * Browser only.
 */

const LIVE_SCRIPT = `
(function () {
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var pill = function (tab, on) { tab.classList.toggle("pill-on", on); tab.classList.toggle("pill-off", !on); tab.setAttribute("aria-selected", String(on)); };

  each(document.querySelectorAll("[data-profile]"), function (root) {
    var typeTabs = root.querySelectorAll("[data-type-tab]");
    var typePanels = root.querySelectorAll("[data-type-panel]");
    each(typeTabs, function (tab) {
      tab.addEventListener("click", function () {
        each(typeTabs, function (other) { pill(other, other === tab); });
        each(typePanels, function (panel) { panel.classList.toggle("hidden", panel.getAttribute("data-type-panel") !== tab.getAttribute("data-type-tab")); });
      });
    });
    each(typePanels, function (typePanel) {
      var tabs = typePanel.querySelectorAll("[data-chapter-tab]");
      var panels = typePanel.querySelectorAll("[data-chapter-panel]");
      each(tabs, function (tab) {
        tab.addEventListener("click", function () {
          each(tabs, function (other) { pill(other, other === tab); });
          each(panels, function (panel) { panel.classList.toggle("hidden", panel.getAttribute("data-chapter-panel") !== tab.getAttribute("data-chapter-tab")); });
        });
      });
    });
  });

  each(document.querySelectorAll("[data-bars]"), function (list) {
    var rows = list.querySelectorAll("[data-row]");
    var set = function (row, open) {
      var toggle = row.querySelector("[data-row-toggle]");
      if (!toggle) return;
      toggle.setAttribute("aria-expanded", String(open));
      row.classList.toggle("bg-track/50", open);
      row.classList.toggle("hover:bg-track/40", !open);
      var details = row.querySelector("[data-row-details]"), summary = row.querySelector("[data-row-summary]"), chevron = row.querySelector("[data-row-chevron]");
      if (details) { details.classList.toggle("hidden", !open); details.classList.toggle("block", open); }
      if (summary) { summary.classList.toggle("hidden", open); summary.classList.toggle("block", !open); }
      if (chevron) chevron.classList.toggle("rotate-90", open);
    };
    each(rows, function (row) {
      var toggle = row.querySelector("[data-row-toggle]");
      if (!toggle) return;
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") !== "true";
        each(rows, function (other) { set(other, other === row && open); });
      });
    });
  });

  each(document.querySelectorAll("figure"), function (figure) {
    var help = figure.querySelector("[data-radar-help]"), active = figure.querySelector("[data-radar-active]");
    if (!help || !active) return;
    var name = active.querySelector("[data-radar-name]"), zone = active.querySelector("[data-radar-zone]");
    each(figure.querySelectorAll("[data-radar-point]"), function (point) {
      var dot = point.querySelector(".radar-dot"), label = point.querySelector("text");
      var leading = point.hasAttribute("data-radar-leading");
      var show = function (on) {
        help.classList.toggle("hidden", on);
        active.classList.toggle("hidden", !on);
        if (on) { name.textContent = point.getAttribute("data-radar-point"); var tag = point.getAttribute("data-radar-tag"); zone.textContent = tag ? " \\u00b7 " + tag : ""; }
        if (dot) dot.setAttribute("r", on ? "7" : "4.5");
        if (label) { label.setAttribute("font-weight", on || leading ? "700" : "500"); label.setAttribute("fill", on || leading ? "var(--cover-ink)" : "var(--cover-muted)"); }
      };
      point.addEventListener("mouseenter", function () { show(true); });
      point.addEventListener("mouseleave", function () { show(false); });
      point.addEventListener("focus", function () { show(true); });
      point.addEventListener("blur", function () { show(false); });
    });
  });

  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  each(document.querySelectorAll("[data-countup]"), function (node) {
    var value = Number(node.getAttribute("data-countup"));
    if (still || !isFinite(value)) return;
    var decimals = value % 1 === 0 ? 0 : 1, start = performance.now();
    var tick = function (now) {
      var p = Math.min(1, (now - start) / 1400);
      node.textContent = (value * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  var reveals = document.querySelectorAll(".reveal");
  if (typeof IntersectionObserver === "undefined") each(reveals, function (node) { node.classList.add("in"); });
  else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    each(reveals, function (node) { observer.observe(node); });
  }
})();
`;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function dataUri(url: string): Promise<string | null> {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Every rule of the page's stylesheets as text. A font face is kept only if the browser really loaded
 * its file (the page uses a few of the many subsets), and then the file is embedded in the rule.
 */
async function pageCss(): Promise<string> {
  const loaded = new Set(performance.getEntriesByType("resource").map((entry) => entry.name));
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[];
    try { rules = Array.from(sheet.cssRules); } catch { continue; } // a stylesheet from another origin can't be read
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) { parts.push(rule.cssText); continue; }
      const match = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(rule.cssText);
      if (!match) continue;
      const url = new URL(match[1], sheet.href ?? document.baseURI).href;
      if (!loaded.has(url)) continue;
      const embedded = await dataUri(url);
      if (embedded) parts.push(rule.cssText.replace(match[0], `url("${embedded}")`));
    }
  }
  return parts.join("\n").replace(/<\/style/gi, "<\\/style");
}

/** The report as one self-contained HTML document. `report` is the report's element on the page. */
export async function buildReportFile(report: HTMLElement, title: string): Promise<Blob> {
  const copy = report.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[data-no-export]").forEach((node) => node.remove());
  copy.querySelectorAll(".reveal").forEach((node) => node.classList.remove("in")); // the file's own script reveals them again
  copy.querySelectorAll<HTMLElement>("[data-countup]").forEach((node) => { node.textContent = node.dataset.countup ?? node.textContent; });

  const root = document.documentElement;
  const html = `<!doctype html>
<html lang="${escapeHtml(root.lang)}" class="${escapeHtml(root.className)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${await pageCss()}</style>
<noscript><style>.reveal { opacity: 1; }</style></noscript>
</head>
<body>
<main class="mx-auto w-full max-w-5xl px-5 pb-24 pt-8 sm:px-8">${copy.outerHTML}</main>
<script>${LIVE_SCRIPT.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
  return new Blob([html], { type: "text/html;charset=utf-8" });
}

export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
