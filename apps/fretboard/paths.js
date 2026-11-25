// Fretboard Trainer · scale paths (Build B, E9 model, TC 25 Nov): the rows of the Scale tab's list.
//   Runs: one octave on 1, 2 or 3 adjacent strings, from the root or any scale note; two octaves on 5 or 6 adjacent strings
//   within a 5-fret span. Positions: the 7 three-notes-per-string patterns (7-note scales only); the CAGED windows are the
//   board's own (cfg.pos) and are listed beside them in the list.
// Rules (mock-up of 25 Nov, decided): the notes rise in scale order on adjacent strings, low string to high, never going
// back a string; on two or more strings each string holds 1 to 4 notes within 5 frets (highest − lowest ≤ 5); one string
// holds the whole octave. Every copy on the neck (frets 0 to the tuning's last) is a row.
// TC's patterns (data/scale-patterns.csv) are stored as his and never regenerated: each copy of a pattern in the current
// key is a row marked with its id; a generated path on the same cells is not listed twice.
// A path: { id, kind ("run" | "3nps"), oct, cells [{ s, f, m, iv }] low to high, strs (string indices low to high),
// counts, lo, hi, span, csv (pattern id or null) }. id = lowest string · first fret · notes per string, so it is unique
// within one scale and key and can sit in the link.
import CSV from "./data/scale-patterns.csv";
import { MODE_IV, scopeIntervals } from "../../core/scales.js";

export const PER_STRING = 4;   // notes on one string, at most (two or more strings)
export const HAND_SPAN = 5;    // frets: a string's notes, and a whole two-octave path (highest − lowest)
const TWO_OCT_STRINGS = [5, 6];

// The scales the list covers: every Scale-menu scale but Major and minor (the blend). TC's patterns are major-scale
// patterns, so they join Scale → Ionian only.
export function pathScale(cfg) {
  if (cfg.scope === "blended" || cfg.scope === "arpeggio") return null;
  const ivs = scopeIntervals(cfg.keyMode, cfg.scope, "triad", cfg.mode);
  return { ivs, seven: ivs.length === 7, csvScale: cfg.scope === "scale" && cfg.mode === "ionian" ? "major" : null };
}

// Strings low to high by open pitch (the tuning lists string 1 first, and may be re-entrant).
const orderOf = (tuning) => [...Array(tuning.strings).keys()].sort((a, b) => tuning.openAbs[a] - tuning.openAbs[b]);

// Every scale pitch (MIDI) the neck can sound, low to high.
function neckPitches(tuning, root, ivs) {
  const set = new Set(ivs), lo = Math.min(...tuning.openAbs), hi = Math.max(...tuning.openAbs) + tuning.frets, out = [];
  for (let m = lo; m <= hi; m++) if (set.has((((m - root) % 12) + 12) % 12)) out.push(m);
  return out;
}

// The ways to split n notes over k strings, each string 1..max (one string: all n).
function splits(n, k, max) {
  if (k === 1) return n <= max ? [[n]] : [];
  const out = [];
  for (let c = 1; c <= Math.min(max, n - (k - 1)); c++) splits(n - c, k - 1, max).forEach((r) => out.push([c, ...r]));
  return out;
}

// Lay the notes on strings order[first], order[first + 1] … by counts; null if a fret is off the neck or a string's notes
// spread past the hand span (two or more strings).
function lay(tuning, root, notes, order, first, counts) {
  const cells = [];
  let i = 0;
  for (let k = 0; k < counts.length; k++) {
    const s = order[first + k];
    let fmin = Infinity, fmax = -Infinity;
    for (let j = 0; j < counts[k]; j++, i++) {
      const m = notes[i], f = m - tuning.openAbs[s];
      if (f < 0 || f > tuning.frets) return null;
      fmin = Math.min(fmin, f); fmax = Math.max(fmax, f);
      cells.push({ s, f, m, iv: (((m - root) % 12) + 12) % 12 });
    }
    if (counts.length > 1 && fmax - fmin > HAND_SPAN) return null;
  }
  return cells;
}

function makePath(kind, oct, cells, counts) {
  const fs = cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
  const strs = [];
  cells.forEach((c) => { if (!strs.includes(c.s)) strs.push(c.s); });
  return { id: `${cells[0].s}-${cells[0].f}-${counts.join("")}`, kind, oct, cells, strs, counts, lo, hi, span: hi - lo, csv: null };
}

// Runs: oct octaves from each start note (start: "root" or "any"), on the string counts the rules allow.
export function runPaths(tuning, root, ivs, oct, start) {
  const ps = neckPitches(tuning, root, ivs), order = orderOf(tuning), n = ivs.length * oct + 1;
  const ks = oct === 1 ? [1, 2, 3] : TWO_OCT_STRINGS;
  const out = [];
  ps.forEach((p, i) => {
    if (start === "root" && (((p - root) % 12) + 12) % 12 !== 0) return;
    const notes = ps.slice(i, i + n);
    if (notes.length < n || notes[n - 1] !== p + 12 * oct) return;
    ks.forEach((k) => {
      splits(n, k, k === 1 ? n : PER_STRING).forEach((counts) => {
        for (let first = 0; first + k <= order.length; first++) {
          const cells = lay(tuning, root, notes, order, first, counts);
          if (!cells) continue;
          const path = makePath("run", oct, cells, counts);
          if (oct > 1 && path.span > HAND_SPAN) continue;
          out.push(path);
        }
      });
    });
  });
  return out;
}

// Three notes per string (7-note scales): from each scale note on the lowest string, 18 notes up, 3 a string over all six.
export function threePerString(tuning, root, ivs) {
  const ps = neckPitches(tuning, root, ivs), order = orderOf(tuning), counts = order.map(() => 3), n = 3 * order.length;
  const out = [];
  ps.forEach((p, i) => {
    const f0 = p - tuning.openAbs[order[0]];
    if (f0 < 0 || f0 > tuning.frets) return;
    const notes = ps.slice(i, i + n);
    if (notes.length < n) return;
    const cells = lay(tuning, root, notes, order, 0, counts);
    if (cells) out.push(makePath("3nps", null, cells, counts));
  });
  return out;
}

// TC's patterns, parsed: line, id, key (pitch class), scale, cells [{ name, f }] in playing order, note, text.
const field = (t) => t.trim().replace(/^"(.*)"$/, "$1").trim();
const KEY_PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
export function parsePatterns(text) {
  const rows = [];
  text.replace(/^﻿/, "").split(/\r?\n/).forEach((l, i) => {
    if (!i || !l.trim()) return;
    const parts = l.match(/("[^"]*"|[^,]*)(,|$)/g).map((p) => field(p.replace(/,$/, "")));
    const [id = "", key = "", scale = "", frets = "", note = ""] = parts;
    const cells = [];
    frets.split("/").forEach((grp) => {
      const t = grp.trim().split(/\s+/).filter(Boolean);
      const name = t.shift();
      t.forEach((x) => cells.push({ name, f: /^\d{1,2}$/.test(x) ? +x : NaN }));
    });
    rows.push({ line: i + 1, id, key: key in KEY_PC ? KEY_PC[key] : -1, keyTok: key, scale, cells, note, text: l.trim() });
  });
  return rows;
}
export const PATTERNS = parsePatterns(CSV);
const PATTERN_SCALES = { major: "ionian" };

// A pattern's cells on this tuning, or a problem: string names, frets, the scale spelled root to root in order, the rules.
function patternCells(tuning, row) {
  const ivs = MODE_IV[PATTERN_SCALES[row.scale]];
  if (!/^[A-Za-z0-9]{1,6}$/.test(row.id)) return { problem: "id must be 1 to 6 letters or digits" };
  if (row.key < 0) return { problem: `key "${row.keyTok}" is not a note name` };
  if (!ivs) return { problem: `scale "${row.scale}" is not one the app reads (major)` };
  if (!row.cells.length) return { problem: "no frets" };
  const cells = [];
  for (const c of row.cells) {
    const s = tuning.labels.indexOf(c.name);
    if (s < 0) return { problem: `string "${c.name}" is not one of ${tuning.labels.join(" ")}` };
    if (!Number.isInteger(c.f) || c.f > tuning.frets) return { problem: `a fret on string ${c.name} is not 0 to ${tuning.frets}` };
    const m = tuning.openAbs[s] + c.f;
    cells.push({ s, f: c.f, m, iv: (((m - row.key) % 12) + 12) % 12 });
  }
  const want = [...ivs, 0];
  if (cells.length !== want.length || cells.some((c, i) => c.iv !== want[i]) || cells.some((c, i) => i && c.m <= cells[i - 1].m) || cells[cells.length - 1].m !== cells[0].m + 12)
    return { problem: `the notes do not run one octave of ${row.keyTok} ${row.scale}, root to root, rising` };
  const order = orderOf(tuning), counts = [];
  for (let i = 0; i < cells.length; i++) {
    const pi = order.indexOf(cells[i].s);
    if (i && pi !== order.indexOf(cells[i - 1].s)) {
      if (pi !== order.indexOf(cells[i - 1].s) + 1) return { problem: "the strings must be adjacent, low to high" };
      counts.push(0);
    }
    if (!counts.length) counts.push(0);
    counts[counts.length - 1]++;
  }
  if (counts.length > 1) for (let k = 0, i = 0; k < counts.length; i += counts[k], k++) {
    const fs = cells.slice(i, i + counts[k]).map((c) => c.f);
    if (counts[k] > PER_STRING || Math.max(...fs) - Math.min(...fs) > HAND_SPAN) return { problem: `string ${row.cells[i].name} holds more than ${PER_STRING} notes or spans more than ${HAND_SPAN} frets` };
  }
  return { cells, counts };
}
// The build's check of the patterns file: one line per problem, empty when the file is good.
export function patternProblems(tuning) {
  const seen = new Set(), out = [];
  PATTERNS.forEach((r) => {
    const { problem } = patternCells(tuning, r);
    if (problem) out.push(`data/scale-patterns.csv line ${r.line} (${r.text}): ${problem}`);
    if (seen.has(r.id)) out.push(`data/scale-patterns.csv line ${r.line}: id ${r.id} is used twice`);
    seen.add(r.id);
  });
  return out;
}

// Each copy of each of TC's patterns in this key: the pattern moved by whole frets to the key, every copy that fits the neck.
export function patternPaths(tuning, root, scaleName) {
  const out = [];
  PATTERNS.forEach((r) => {
    if (r.scale !== scaleName) return;
    const pc = patternCells(tuning, r);
    if (pc.problem) return;
    const fs = pc.cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
    for (let k = -tuning.frets - 12; k <= tuning.frets + 12; k++) {
      if ((((k - (root - r.key)) % 12) + 12) % 12 || lo + k < 0 || hi + k > tuning.frets) continue;
      const cells = pc.cells.map((c) => ({ s: c.s, f: c.f + k, m: c.m + k, iv: c.iv }));
      out.push({ ...makePath("run", 1, cells, pc.counts), csv: r.id });
    }
  });
  return out;
}

// The list's paths for one scale and key, cached. Runs for oct and start; TC's copies join the one-octave, root runs.
const CACHE = new Map();
export function scalePaths(tuning, root, sc, oct, start) {
  const id = `${tuning.id}|${root}|${sc.ivs.join(",")}|${sc.csvScale}|${oct}|${start}`;
  if (CACHE.has(id)) return CACHE.get(id);
  const gen = runPaths(tuning, root, sc.ivs, oct, start);
  let out = gen;
  if (sc.csvScale && oct === 1) {
    const mine = patternPaths(tuning, root, sc.csvScale);
    const ids = new Set(mine.map((p) => p.id));
    out = [...mine, ...gen.filter((p) => !ids.has(p.id))];
  }
  CACHE.set(id, out);
  return out;
}
const CACHE3 = new Map();
export function scale3nps(tuning, root, sc) {
  if (!sc.seven) return [];
  const id = `${tuning.id}|${root}|${sc.ivs.join(",")}`;
  if (!CACHE3.has(id)) CACHE3.set(id, threePerString(tuning, root, sc.ivs));
  return CACHE3.get(id);
}
