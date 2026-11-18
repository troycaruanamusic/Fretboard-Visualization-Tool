// Fretboard Trainer · the guitar: standard tuning, strings, frets and column widths.
export const OPEN = [4,11,7,2,9,4];
export const OPEN_ABS = [64,59,55,50,45,40];
// e4 B3 G3 D3 A2 E2 as MIDI numbers, for pitch order across strings
export const STRING_LABELS = ["e","B","G","D","A","E"];
export const STRING_GAUGE = [1.2,1.6,2.1,2.6,3.2,3.8];
export const FRETS = 21;
export const MARKERS = {3:1,5:1,7:1,9:1,12:2,15:1,17:1,19:1,21:1};
// Column widths at full size: the open column, then frets 1–21 tapering 60 → 34 px, so a 30 px dot fits every fret.
// Each column is minmax(w px, w fr): the neck fills the width when that fits and scrolls at full size below it (RS-01).
export const COL_PX = [64, ...Array.from({ length: FRETS }, (_, i) => Math.round(60 * Math.pow(34 / 60, i / (FRETS - 1))))];
export const SET_NAME = ["1–3", "2–4", "3–5", "4–6"];
