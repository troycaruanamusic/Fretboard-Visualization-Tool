// Shared core · link format: note tokens and value readers for query parameters.
import { NOTES_SHARP, KEY_NAME } from "./notes.js";

// URL state (UX-18, Round 7): page, key and the Neck, Chords, Modes and Atlas state, as query parameters. A value at its default is
// left out, so the plain address is the default view. Help is not in the URL. Notes are C, Db … B with s for sharp (Fs, Cs).
export const NOTE_TOK = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
export const NOTE_IN = (v) => { const t = String(v).replace(/s$/, "#"); const i = NOTE_TOK.indexOf(t); return i >= 0 ? i : NOTES_SHARP.indexOf(t); };
export const noteTok = (pc, km) => (km ? KEY_NAME[km][pc] : NOTE_TOK[pc]).replace("#", "s");
// drop-3 sets by top and bottom string: 5 3 2 1, 6 4 3 2 (Round 10)
export const oneOf = (...vs) => (v) => (vs.includes(v) ? v : undefined);
export const intIn = (lo, hi) => (v) => (/^-?\d+$/.test(v) && +v >= lo && +v <= hi ? +v : undefined);
export const listIn = (lo, hi) => (v) => { const a = v.split(".").map(intIn(lo, hi)); return a.every((x) => x !== undefined) && new Set(a).size === a.length ? a : undefined; };
