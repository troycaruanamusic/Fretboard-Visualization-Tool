// Fretboard Trainer · open-position voicings (Round 17): TC's list, data/open-voicings.csv, bundled into the page at build
// time. Columns: root (C, F#, Bb), quality (the app's key: major, minor, dom7, min7, add13 …), frets low E to high e
// (x muted, spaces between), note (TC's, not shown in the app). Notes, degrees, name, inversion and window are worked out
// from the frets. The build checks every row (identify.js, openProblems) and fails on a bad one.
import CSV from "./data/open-voicings.csv";
import { NOTE_IN } from "../../core/link.js";

const field = (t) => t.trim().replace(/^"(.*)"$/, "$1").trim();
// One row: line number in the file, root (pitch class, -1 if unreadable), quality, frets string 1 first (null muted, NaN
// unreadable) and the row's text.
export function parseOpen(text) {
  return text.replace(/^﻿/, "").split(/\r?\n/).map((l, i) => [l, i + 1]).slice(1).filter(([l]) => l.trim()).map(([l, line]) => {
    const [rt = "", q = "", fr = ""] = l.split(",").map(field);
    const tok = rt.replace("♯", "#").replace("♭", "b");
    const frets = fr.split(/\s+/).filter(Boolean).map((t) => (/^x$/i.test(t) ? null : /^\d{1,2}$/.test(t) ? +t : NaN)).reverse();
    return { line, root: tok ? NOTE_IN(tok) : -1, rootTok: rt, q, frets, text: l.trim() };
  });
}
export const OPEN_ROWS = parseOpen(CSV);
