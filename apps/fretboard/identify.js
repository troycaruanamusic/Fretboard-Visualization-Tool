// Fretboard Trainer · the Atlas's Identify mode (build plan step 7, Identify mock-up of 19 Nov, TC's answers): name a tapped
// shape. A shape is one entry per string, string 1 first: null (muted) or a fret. Names come from the Neck's chord list
// (CH_QUALS); the matcher allows one omission, the 5th of a 4-note chord, and never the root (no-root names wait for the
// 9th chords, TC 19 Nov).
import { DEG_LABEL } from "../../core/scales.js";
import { accs, spellAt } from "../../core/spelling.js";
import { CH_QUALS, CH_TYPE_KEYS, chIvs, chName, chordCtx, chordCards, INV_LABEL } from "./chordshapes.js";
import { OPEN_ROWS } from "./openvoicings.js";

// Spelling with no chord to spell from (mock-up call 8): C♯ E♭ F♯ A♭ B♭.
export const PLAIN = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const Q_ORD = Object.fromEntries(CH_QUALS.map(([k], i) => [k, i]));
const pcOf = (tuning, c) => (tuning.open[c.s] + c.f) % 12;
const absOf = (tuning, c) => tuning.openAbs[c.s] + c.f;

// The played cells (s, f), the distinct pitch classes low to high (first sounding), and the bass cell.
export function shapeInfo(tuning, shape) {
  const cells = [];
  shape.forEach((f, s) => { if (f !== null && f !== undefined) cells.push({ s, f }); });
  const low = [...cells].sort((a, b) => absOf(tuning, a) - absOf(tuning, b));
  const pcs = [];
  low.forEach((c) => { const p = pcOf(tuning, c); if (!pcs.includes(p)) pcs.push(p); });
  return { cells, pcs, bass: low.length ? low[0] : null, bassPc: low.length ? pcOf(tuning, low[0]) : null };
}
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// Every chord in the list whose tones are the shape's notes: exact, or a 4-note chord with its perfect 5th left out (mock-up
// call 5). Root required. Ranked (call 4): root in the bass, then exact before no 5th, then the app's quality order; then the
// inversion (bass tone's place in the formula), which separates the symmetric chords (dim7, aug) that share their notes.
export function readings(tuning, shape) {
  const { cells, pcs, bassPc } = shapeInfo(tuning, shape);
  if (pcs.length < 3) return [];
  const S = new Set(pcs), out = [];
  for (let root = 0; root < 12; root++) for (const [q] of CH_QUALS) {
    const ivs = chIvs(q), T = new Set(ivs.map((iv) => (root + iv) % 12));
    let omit = null;
    if (!sameSet(S, T)) {
      if (ivs.length !== 4 || !ivs.includes(7)) continue;
      T.delete((root + 7) % 12);
      if (!sameSet(S, T)) continue;
      omit = "5";
    }
    out.push(reading(tuning, root, q, omit, cells, bassPc));
  }
  return out.sort(rankCmp);
}
const rankCmp = (a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.rank[2] - b.rank[2] || a.rank[3] - b.rank[3];

// Every generated shape of a chord, copies 12 up included, made once per tuning, root and quality.
const GEN = new Map();
function genCards(tuning, root, q) {
  const id = `${tuning.id}|${root}|${q}`;
  if (!GEN.has(id)) GEN.set(id, chordCards(tuning, root, q, CH_TYPE_KEYS, true));
  return GEN.get(id);
}
function reading(tuning, root, q, omit, cells, bassPc) {
  const x = chordCtx(root, q), biv = (((bassPc - root) % 12) + 12) % 12, inv = x.ivs.indexOf(biv);
  const name = x.rn + x.sfx + (inv > 0 ? "/" + x.name(bassPc) : "");
  const degs = x.ivs.filter((iv) => !(omit === "5" && iv === 7)).map(x.deg);
  // A generated shape of this chord (mock-up call 7): the same cells, lowest copy or 12 up; CAGED forms first, then the
  // voicing types in their button order, as chordCards makes them.
  const key = (cs) => cs.map((c) => c.s * 100 + c.f).sort((a, b) => a - b).join(",");
  const mine = key(cells);
  const gen = genCards(tuning, root, q).find((c) => key(c.cells) === mine) || null;
  return {
    id: `${root}.${q}`, root, q, omit, inv, name, ctx: x,
    full: chName(root, q) + (omit ? " (no 5th)" : ""),
    degs, invText: INV_LABEL[inv] + (inv > 0 ? ` (${x.deg(biv)} in the bass)` : ""),
    gen, rank: [inv === 0 ? 0 : 1, omit ? 1 : 0, Q_ORD[q], inv],
  };
}

// No match (mock-up proposal, TC 19 Nov; every reading, ranked, TC 20 Nov): the chords the shape holds with one note left
// over, exact or with the 5th left out as above. Ranked: the chord's root in the bass, then another chord tone in the bass
// (a slash name), then the extra note in the bass ("over C"); then exact before no 5th, the quality order and the inversion.
// The extra note is spelled from the chord's root by its interval.
export function oneOver(tuning, shape) {
  const { pcs, bassPc } = shapeInfo(tuning, shape);
  if (pcs.length < 4) return [];
  const S = new Set(pcs), out = [];
  for (let root = 0; root < 12; root++) {
    if (!S.has(root)) continue;
    for (const [q] of CH_QUALS) {
      const ivs = chIvs(q);
      [null, "5"].forEach((omit) => {
        if (omit && (ivs.length !== 4 || !ivs.includes(7))) return;
        const T = ivs.filter((iv) => !(omit && iv === 7)).map((iv) => (root + iv) % 12);
        if (T.length !== S.size - 1 || !T.every((p) => S.has(p))) return;
        const extra = pcs.find((p) => !T.includes(p));
        const x = chordCtx(root, q), biv = (((bassPc - root) % 12) + 12) % 12;
        const eiv = (((extra - root) % 12) + 12) % 12, d = /(\d)$/.exec(DEG_LABEL[eiv]);
        const extraName = accs(spellAt(x.li + +d[1] - 1, extra));
        const nm = (slash) => x.rn + x.sfx + slash + (omit ? " (no 5th)" : "");
        const group = bassPc === root ? 0 : bassPc === extra ? 2 : 1;
        const inv = group === 1 ? ivs.indexOf(biv) : 0;
        out.push({
          id: `${root}.${q}.${omit || ""}`, root, q, omit, extra,
          name: group === 1 ? nm("/" + x.name(bassPc)) : nm(""),
          rest: group === 2 ? `over ${extraName}` : `+ ${extraName}`,
          rank: [group, omit ? 1 : 0, Q_ORD[q], inv],
        });
      });
    }
  }
  return out.sort(rankCmp);
}

// Link format: frets low string to high, x for muted, dot-separated ("x.3.2.0.1.0"); the all-muted shape is the default.
export const emptyShape = (tuning) => Array.from({ length: tuning.strings }, () => null);
export const shapeTok = (shape) => [...shape].reverse().map((f) => (f === null ? "x" : String(f))).join(".");
export function shapeIn(v, tuning) {
  const a = String(v).split(".");
  if (a.length !== tuning.strings) return undefined;
  const fs = a.map((t) => (t === "x" ? null : /^\d{1,2}$/.test(t) && +t <= tuning.frets ? +t : undefined));
  return fs.includes(undefined) ? undefined : fs.reverse();
}

// The open-position list's check (Round 17), run by the build: a row that fails stops it, with the line and the reason. Each
// row needs a note name, one of the app's quality keys and a fret or x for every string, low E to high e, all within frets
// 0–4; its notes must spell its chord as Identify reads them (every tone, or a 4-note chord without its perfect 5th; the root
// in the shape); and it must not repeat another row or a generated shape of its chord (any type, lowest copy or 12 up).
export function openProblems(tuning) {
  const out = [], seen = new Map(), keys = CH_QUALS.map(([k]) => k), gen = CH_TYPE_KEYS.filter((t) => t !== "open");
  const key = (cs) => cs.map((c) => c.s * 100 + c.f).sort((a, b) => a - b).join(",");
  OPEN_ROWS.forEach((o) => {
    const p = [];
    if (o.root < 0) p.push(`root "${o.rootTok}" is not a note name (C, F#, Bb …)`);
    if (!keys.includes(o.q)) p.push(`quality "${o.q}" is not one of ${keys.join(", ")}`);
    if (o.frets.length !== tuning.strings || o.frets.some((f) => Number.isNaN(f))) p.push(`frets need ${tuning.strings} entries, low E to high e, each x or a fret number`);
    else if (o.frets.some((f) => f !== null && f > 4)) p.push("a fret above 4 (open position is frets 0–4)");
    if (!p.length) {
      const { cells, pcs } = shapeInfo(tuning, o.frets);
      const r = readings(tuning, o.frets).find((x) => x.root === o.root && x.q === o.q);
      if (!r) p.push(`its notes ${pcs.map((c) => PLAIN[c]).join(" ")} don't spell ${chName(o.root, o.q)}`);
      else {
        const k = `${o.root}|${o.q}|${key(cells)}`;
        if (seen.has(k)) p.push(`same shape as line ${seen.get(k)}`);
        else seen.set(k, o.line);
        const g = chordCards(tuning, o.root, o.q, gen, true).find((c) => key(c.cells) === key(cells));
        if (g) p.push(`already generated (${g.mark}${g.k ? ", 12 up" : ""})`);
      }
    }
    if (p.length) out.push(`line ${o.line} (${o.text}): ${p.join("; ")}`);
  });
  return out;
}
