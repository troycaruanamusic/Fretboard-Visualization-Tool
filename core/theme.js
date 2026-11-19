// Shared core · design tokens and themes (ChordCharts' four: Light, Dark, Stage, High contrast).
// Colour roles (BR-02): gold = the key, CAGED = position, greyscale = everything else. The values live in design.css, one
// block per theme on <html data-theme>; THEME holds var() references, so inline styles follow the theme without a re-render.
const TOKENS = ["bg", "panel", "panel2", "track", "ctl", "ctlHover", "edge", "line", "text", "muted", "sel", "onSel", "ink", "nut", "link", "fret", "inlay", "dotEdge", "hot"];
const cssName = (k) => "--" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
export const THEME = Object.freeze(Object.fromEntries(TOKENS.map((k) => [k, `var(${cssName(k)})`])));
export const THEMES = [["light", "Light"], ["dark", "Dark"], ["stage", "Stage"], ["contrast", "High contrast"]];
export const THEME_DEFAULT = "dark";
// Stored per browser, not in the link (Round 15). The page template applies it before first paint.
const KEY = "ft:theme";
const known = (t) => THEMES.some(([k]) => k === t);
export function storedTheme() {
  try { const t = window.localStorage.getItem(KEY); return known(t) ? t : THEME_DEFAULT; } catch (e) { return THEME_DEFAULT; }
}
export function applyTheme(t, save = true) {
  const name = known(t) ? t : THEME_DEFAULT;
  document.documentElement.dataset.theme = name;
  if (save) try { window.localStorage.setItem(KEY, name); } catch (e) {}
  return name;
}
