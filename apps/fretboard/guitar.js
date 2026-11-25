// Fretboard Trainer · the guitar neck: fret markers, column widths and string-set names. Strings, open pitches, labels,
// gauges and the fret count are the tuning's (tunings.js).
export const MARKERS = {3:1,5:1,7:1,9:1,12:2,15:1,17:1,19:1,21:1};
// Column widths at full size: the open column, then frets 1 to the last tapering 60 → 34 px, so a 30 px dot fits every fret.
// Each column is minmax(w px, w fr): the neck fills the width when that fits and scrolls at full size below it (RS-01).
const COL_CACHE = new Map();
export function colPx(frets) {
  if (!COL_CACHE.has(frets)) COL_CACHE.set(frets, [64, ...Array.from({ length: frets }, (_, i) => Math.round(60 * Math.pow(34 / 60, i / (frets - 1))))]);
  return COL_CACHE.get(frets);
}
// Neck size (Build C, E9 model; TC 25 Nov: M is v0.43's neck, S and L about 15 % either side, kept per browser like Theme).
// String row height, note tile (chord tones and the shape's notes), small tile (other scale notes, open squares), the In key
// ladder's outlined shapes, label size (never under 11 px), string-label column, inlay dot, the × at the nut, column scale.
export const NECK_SIZES = [["S", "Small"], ["M", "Medium"], ["L", "Large"]];
export const NECK = {
  S: { cellH: 39, tile: 26, small: 20, ladder: 22, font: 11, labW: 26, inlay: 9, mute: 13, k: 0.85 },
  M: { cellH: 46, tile: 30, small: 24, ladder: 26, font: 11, labW: 30, inlay: 11, mute: 15, k: 1 },
  L: { cellH: 53, tile: 34, small: 28, ladder: 30, font: 12, labW: 34, inlay: 13, mute: 17, k: 1.15 },
};
export const neckOf = (size) => NECK[size] || NECK.M;
// Kept per browser, not in the link (as Theme, Round 15).
const SIZE_KEY = "ft:necksize";
export function storedNeckSize() {
  try { const v = window.localStorage.getItem(SIZE_KEY); return NECK[v] ? v : "M"; } catch (e) { return "M"; }
}
export function saveNeckSize(v) { try { window.localStorage.setItem(SIZE_KEY, v); } catch (e) { /* storage unavailable */ } }
// The grid columns for frets lo to hi: the string-label column, then each fret's column scaled for the size.
export function neckCols(tuning, g, lo = 0, hi = tuning.frets) {
  return `${g.labW}px ${colPx(tuning.frets).slice(lo, hi + 1).map((n) => { const w = g.k === 1 ? n : Math.round(n * g.k); return `minmax(${w}px, ${w}fr)`; }).join(" ")}`;
}
// Frets (Build C, E9 model; mock-up of 25 Nov): the part of the neck shown. The necks draw only these frets and the lists under
// them keep only what fits inside (TC, 25 Nov). One setting for the Scale and Chord tabs, in the link.
export const FRET_RANGES = [["0-21", "0–21"], ["0-12", "0–12"], ["0-7", "0–7"], ["5-12", "5–12"], ["7-15", "7–15"], ["12-21", "12–21"]];
export const FULL_RANGE = "0-21";
export function rangeOf(tuning, key) {
  const m = /^(\d+)-(\d+)$/.exec(key || "");
  const lo = m ? Math.min(+m[1], tuning.frets) : 0, hi = m ? Math.min(+m[2], tuning.frets) : tuning.frets;
  return { key, lo, hi, full: lo === 0 && hi === tuning.frets, label: `${lo}–${hi}` };
}
// Cells inside the range.
export const inRange = (r, cells) => cells.every((c) => c.f >= r.lo && c.f <= r.hi);
// Three-string set names, top string first. These and the drop-2 / drop-3 sets assume six strings; they are redesigned with
// the other tunings, which this app no longer plans (TC, 25 Nov).
export const SET_NAME = ["1–3", "2–4", "3–5", "4–6"];
// Inlays (Round 15): a single dot sits on the line between the middle strings (3 and 4 on six), the double at 12 between
// strings 2–3 and 4–5. Cell (s, f) carries the dot on its lower edge, so the dot sits between string s and s + 1.
const inlayRows = (strings, n) => n === 2 ? [Math.floor(strings / 2) - 2, Math.floor(strings / 2)] : [Math.floor(strings / 2) - 1];
export const inlayAt = (strings, s, f) => !!MARKERS[f] && inlayRows(strings, MARKERS[f]).includes(s);
