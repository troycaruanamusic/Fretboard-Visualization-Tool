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
// Three-string set names, top string first. These and the drop-2 / drop-3 sets assume six strings; they are redesigned with
// the other tunings (plan step 8).
export const SET_NAME = ["1–3", "2–4", "3–5", "4–6"];
