// Fretboard Trainer · the Atlas's chord shapes (Chords mode, app-structure plan step 6): every shape of one chord, root and
// quality, as cards. Shape kinds: CAGED forms, open-position voicings (TC's list, Round 17), closed triads, drop 2 and drop 3
// voicings, and shells. Closed, drop 2 and
// drop 3 shapes are placed as the Chords page places its ladders (v0.34 rules: each tone the next one above the string
// below, the inversion's tone in the bass); string sets, shell strings and the CAGED templates are six-string standard-tuning
// constants (standard tuning only, TC 25 Nov). The tuning gives the open pitches and the fret count.
import { DEG_LABEL, DEG_OVERRIDE, scopeIntervals } from "../../core/scales.js";
import { KEY_NAME, LETTERS } from "../../core/notes.js";
import { accs, spellAt } from "../../core/spelling.js";
import { QUAL_COMMON, QUAL_MORE, QUAL_T, DROP2, DROP3, INV_NAME7 } from "../../core/chords.js";
import { POS_MAJOR, POS_MINOR, CAGED_ANCHOR, cagedForms } from "./caged.js";
import { OPEN_ROWS } from "./openvoicings.js";

// Voicing types: key, label, short name (the phone's Type filter). Labels use the standard terms in full (TC, 19 Nov); the
// definitions are in Help.
export const CH_TYPES = [["caged", "CAGED forms", "CAGED"], ["open", "Open position", "Open"], ["triad", "Closed triads", "Triads"], ["drop2", "Drop 2 voicings", "Drop 2"], ["drop3", "Drop 3 voicings", "Drop 3"], ["shell", "Shells (R 3 7)", "Shells"]];
export const CH_TYPE_KEYS = CH_TYPES.map(([k]) => k);
const CARD_NAME = { open: "Open position", triad: "Closed triad", drop2: "Drop 2 voicing", drop3: "Drop 3 voicing", shell: "Shell voicing" };
export const INV_LABEL = INV_NAME7.map((s) => s[0].toUpperCase() + s.slice(1));

// Qualities, as the Neck's Any chord lists them. Major and Minor are the triads.
export const CH_QUALS = [...QUAL_COMMON, ...QUAL_MORE.flatMap(([, qs]) => qs)];
const Q_LABEL = Object.fromEntries(CH_QUALS);
export const chIvs = (q) => (q === "major" ? [0, 4, 7] : q === "minor" ? [0, 3, 7] : scopeIntervals("major", "arpeggio", q));
// Windows (and the Neck's Major / Minor) by the chord's 3rd: QUAL_T's qualities, then the ones it leaves to the current
// key, fixed here so a card and the Neck it opens use the same windows: dim, m7♭5 and dim7 minor, the sus chords major.
export const chTon = (q) => (q === "major" || q === "minor" ? q : QUAL_T[q] || (q === "dim" || q === "m7b5" || q === "dim7" ? "minor" : "major"));
export const chSuffix = (q) => (q === "major" ? "" : q === "minor" ? "m" : Q_LABEL[q]);
// Root names: the 24 standard key names, the minor list for chords with a minor 3rd (C♯m, G♯dim; not D♭m).
export const chRootName = (root, q) => accs(KEY_NAME[chIvs(q).includes(3) && !chIvs(q).includes(4) ? "minor" : "major"][root]);
export const chName = (root, q) => (q === "major" || q === "minor" ? `${chRootName(root, q)} ${q}` : chRootName(root, q) + chSuffix(q));

const SHELL_Q = ["dom7", "maj7", "min7", "m7b5", "dim7", "aug7"];
// CAGED forms (TC, 19 Nov): major, minor, 7, maj7 and m7, each form the standard open chord moved to the root. Frets low E
// to high e in the form's own key (x = null); the form sits in its window of the chord's Major / Minor windows.
const CAGED_HOME = { C: 0, A: 9, G: 7, E: 4, D: 2 };
const CAGED_NUM = { C: 1, A: 2, G: 3, E: 4, D: 5 };
const X = null;
const CAGED = {
  major: { C: [X, 3, 2, 0, 1, 0], A: [X, 0, 2, 2, 2, 0], G: [3, 2, 0, 0, 0, 3], E: [0, 2, 2, 1, 0, 0], D: [X, X, 0, 2, 3, 2] },
  minor: { C: [X, 3, 1, 0, 1, X], A: [X, 0, 2, 2, 1, 0], G: [3, 1, 0, 0, 3, 3], E: [0, 2, 2, 0, 0, 0], D: [X, X, 0, 2, 3, 1] },
  dom7: { C: [X, 3, 2, 3, 1, 0], A: [X, 0, 2, 0, 2, 0], G: [3, 2, 0, 0, 0, 1], E: [0, 2, 0, 1, 0, 0], D: [X, X, 0, 2, 1, 2] },
  maj7: { C: [X, 3, 2, 0, 0, 0], A: [X, 0, 2, 1, 2, 0], G: [3, 2, 0, 0, 0, 2], E: [0, 2, 1, 1, 0, 0], D: [X, X, 0, 2, 2, 2] },
  min7: { C: [X, 3, 1, 3, 1, X], A: [X, 0, 2, 0, 1, 0], G: [3, 1, 3, 0, 3, 3], E: [0, 2, 0, 0, 0, 0], D: [X, X, 0, 2, 1, 1] },
};
// CAGED form of any voicing (Round 15): the windows of the chord's root that hold the whole shape (cagedForms). Where two
// hold it, the form whose standard grip shares the most notes with the shape wins; a tie keeps both. Qualities with no
// grip of their own compare with the nearest one (GRIP_Q), else the grip of their Major / Minor.
const GRIP_Q = { maj: "major", min: "minor", dim: "minor", m7: "min7", m7b5: "min7", mmaj7: "minor", maj7s5: "maj7", dim7: "minor" };
export function chordForms(root, ton, q, cells) {
  const cand = cagedForms(root, ton, cells);
  if (cand.length < 2) return cand;
  const tpl = CAGED[GRIP_Q[q] || q] || CAGED[ton];
  const score = (L) => {
    const t = root - CAGED_HOME[L], g = tpl[L];
    return cells.filter((c) => { const gf = g[g.length - 1 - c.s]; return gf !== null && (((gf + t - c.f) % 12) + 12) % 12 === 0; }).length;
  };
  const best = Math.max(...cand.map(score));
  return cand.filter((L) => score(L) === best);
}
// Which types a quality has: CAGED forms for the five above; open position where the list has a row of that quality (any
// root: the button stays as the root changes); closed triads for 3-note chords; drop 2 and drop 3 for 4-note chords; shells
// for sevenths with a 3rd.
export function chAvail(q) {
  const n = chIvs(q).length;
  return CH_TYPE_KEYS.filter((t) => (t === "caged" ? !!CAGED[q] : t === "open" ? OPEN_ROWS.some((o) => o.q === q) : t === "triad" ? n === 3
    : t === "drop2" || t === "drop3" ? n === 4 : SHELL_Q.includes(q)));
}
// The list's rows of one chord, in file order, as cells (s, f). Standard tuning only.
export const openRows = (tuning, root, q) => (tuning.id === "std" ? OPEN_ROWS.filter((o) => o.root === root && o.q === q) : []);

// String sets, low string first, by string index (0 = string 1). Six-string standard-tuning constants.
const TRIAD_SETS = [0, 1, 2, 3].map((g) => [g + 2, g + 1, g]);
const DROP2_SETS = [0, 1, 2].map((g) => [g + 3, g + 2, g + 1, g]);
const DROP3_SETS = [0, 1].map((g) => [g + 4, g + 2, g + 1, g]);
// Shells: R 7 3 on strings 6 4 3 and 5 3 2; R 3 7 on 6 5 4 and 5 4 3 (TC, 19 Nov). Order: chord-tone indices R, 3rd, 7th.
const SHELLS = [[[5, 3, 2], [0, 3, 1]], [[4, 2, 1], [0, 3, 1]], [[5, 4, 3], [0, 1, 3]], [[4, 3, 2], [0, 1, 3]]];

// The strings of a shape as a token (string numbers, high string first: "123", "1235") and as a tag: a run reads 1–4,
// a set with a skip reads low to high, 6 4 3 2.
export const strTok = (strs) => [...strs].sort((a, b) => a - b).map((s) => s + 1).join("");
export function strLabel(tok) {
  const n = tok.split("").map(Number);
  const run = n.every((v, i) => !i || v === n[i - 1] + 1);
  return run ? `${n[0]}–${n[n.length - 1]}` : [...n].reverse().join(" ");
}

// Places the chord tones `order` (pitch classes, bass first) on strings `strs` (low to high): each tone the next one above
// the string below, the whole shape at its lowest place with every fret on the board (the Chords page's rule).
function place(tuning, strs, order) {
  const up = (p, pc) => { let m = p; while (((m % 12) + 12) % 12 !== pc) m++; return m; };
  const build = (b) => { const ps = [b]; order.slice(1).forEach((pc) => ps.push(up(ps[ps.length - 1] + 1, pc))); return ps; };
  let bass = up(tuning.openAbs[strs[0]] - 12, order[0]);
  while (build(bass).some((m, i) => m - tuning.openAbs[strs[i]] < 0)) bass += 12;
  const frets = build(bass).map((m, i) => m - tuning.openAbs[strs[i]]);
  return Math.max(...frets) > tuning.frets ? null : strs.map((s, i) => ({ s, f: frets[i] }));
}

// Every shape of the chord (root, quality q) of the chosen types, the lowest copy of each and, with up, its copy 12 frets
// higher where all of it fits. Each card: id, kind, cells (s, f, iv), frets per string, strings token, inversion, span
// (fretted notes only), lo / hi (open strings count as fret 0), the CAGED window that holds every note (or null), title,
// fret string and tags.
// The chord's names and windows, shared by its generated cards and by a shape tapped in Identify (Round 16): root name and
// suffix, degree names (deg), note names spelled from the root letter (name) and the CAGED window that holds a whole shape.
export function chordCtx(root, q) {
  const ivs = chIvs(q), ton = chTon(q);
  const posList = ton === "major" ? POS_MAJOR : POS_MINOR;
  const base = (p) => (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
  const winOf = (cells) => { const p = posList.find((w) => cells.every((c) => ((((c.f - base(w)) % 12) + 12) % 12) <= w.w)); return p ? p.num : null; };
  const rn = chRootName(root, q), li = LETTERS.indexOf(rn[0]), sfx = chSuffix(q);
  const degKey = q === "major" || q === "minor" ? "triad" : q;
  const deg = (iv) => (DEG_OVERRIDE[degKey] && DEG_OVERRIDE[degKey][iv]) || DEG_LABEL[iv];
  const name = (pc) => { const d = /(\d+)$/.exec(deg((((pc - root) % 12) + 12) % 12)); return accs(spellAt(li + (d ? +d[1] : 1) - 1, pc)); };
  return { root, q, ivs, ton, winOf, rn, li, sfx, deg, name };
}
// One card from a shape's cells (s, f), as chordCards makes it. r: { kind, form } (kind "shape" for a tapped shape); k: 0, or
// 12 for a copy 12 frets up (already added to the cells).
function cardOf(tuning, x, r, cells, k) {
  const { root, q, ivs, ton, winOf, rn, sfx, deg, name } = x;
  cells.forEach((c) => { c.iv = (((tuning.open[c.s] + c.f - root) % 12) + 12) % 12; });
  const bass = cells.reduce((a, c) => (tuning.openAbs[c.s] + c.f < tuning.openAbs[a.s] + a.f ? c : a));
  const inv = ivs.indexOf(bass.iv);
  const frets = Array.from({ length: tuning.strings }, (_, s) => { const c = cells.find((y) => y.s === s); return c ? c.f : null; });
  const fs = cells.map((c) => c.f), fretted = fs.filter((f) => f > 0);
  const tok = strTok(cells.map((c) => c.s));
  const strsLow = [...cells].sort((a, b) => b.s - a.s).map((c) => c.s);
  const pos = r.kind === "caged" ? CAGED_NUM[r.form] : winOf(cells);
  const forms = r.kind === "caged" ? [r.form] : chordForms(root, ton, q, cells);
  // An open-position card's id is its frets, low E to high e (o x32010), so a link keeps it when rows move in the list.
  const id = r.kind === "shape" ? "y" : (r.kind === "caged" ? "c" + r.form : r.kind === "open" ? "o" + [...frets].reverse().map((f) => (f === null ? "x" : f - k)).join("")
    : { triad: "t", drop2: "d", drop3: "e", shell: "s" }[r.kind] + tok + inv) + (k ? "u" : "");
  // A row of the list may leave out the 5th of a 4-note chord (C6 x 3 2 2 1 0); its card says so.
  const no5 = r.kind === "open" && ivs.some((iv) => !cells.some((c) => c.iv === iv));
  const title = rn + sfx + (inv > 0 ? "/" + name((root + ivs[inv]) % 12) : "") + (k ? " · 12 up" : "");
  return {
    id, kind: r.kind, form: r.form || null, forms, k, cells, frets, tok, inv, pos, bassStr: strsLow[0],
    lo: Math.min(...fs), hi: Math.max(...fs), span: fretted.length ? Math.max(...fretted) - Math.min(...fretted) + 1 : 0,
    open: fs.some((f) => f === 0), root, q, title,
    sub: [...frets].reverse().map((f) => (f === null ? "x" : f)).join(" "),
    mark: r.kind === "caged" ? `CAGED ${r.form} form` : r.kind === "shape" ? "Your shape" : CARD_NAME[r.kind],
    tags: r.kind === "caged" ? [`Window ${pos}`] : r.kind === "shape" ? [INV_LABEL[inv], ...(pos ? [`Window ${pos}`] : [])] : [INV_LABEL[inv], `Strings ${strLabel(tok)}`, ...(no5 ? ["No 5th"] : [])],
    deg, name,
  };
}
// A tapped shape as a card of the chord (root, q) (Identify, Round 16). Its notes must all be tones of the chord.
export const shapeCard = (tuning, root, q, cells) => cardOf(tuning, chordCtx(root, q), { kind: "shape" }, cells.map((c) => ({ s: c.s, f: c.f })), 0);

export function chordCards(tuning, root, q, types, up) {
  const x = chordCtx(root, q), { ivs } = x, pcs = ivs.map((iv) => (root + iv) % 12);
  const raw = [];
  const want = new Set(types.filter((t) => chAvail(q).includes(t)));
  if (want.has("caged") && tuning.id === "std") Object.entries(CAGED[q]).forEach(([L, tpl]) => {
    const t = (((root - CAGED_HOME[L]) % 12) + 12) % 12;
    const cells = [];
    tpl.forEach((f, i) => { if (f !== null) cells.push({ s: tuning.strings - 1 - i, f: f + t }); });
    raw.push({ kind: "caged", form: L, cells });
  });
  if (want.has("open")) openRows(tuning, root, q).forEach((o) => {
    const cells = [];
    o.frets.forEach((f, s) => { if (f !== null) cells.push({ s, f }); });
    raw.push({ kind: "open", cells });
  });
  if (want.has("triad")) TRIAD_SETS.forEach((strs) => [0, 1, 2].forEach((inv) => raw.push({ kind: "triad", cells: place(tuning, strs, [...pcs.slice(inv), ...pcs.slice(0, inv)]) })));
  // Drop 2 and drop 3 come from the close voicing: the four tones within one octave, low to high. For sevenths and 6 chords
  // that is the formula order (R 3 5 7); an added 9th or 11th sits inside the octave (R 9 3 5, R 3 11 5).
  const close = [...ivs].sort((a, b) => a - b).map((iv) => (root + iv) % 12);
  if (want.has("drop2")) DROP2_SETS.forEach((strs) => [0, 1, 2, 3].forEach((inv) => raw.push({ kind: "drop2", cells: place(tuning, strs, DROP2[inv].map((i) => close[i])) })));
  if (want.has("drop3")) DROP3_SETS.forEach((strs) => [0, 1, 2, 3].forEach((inv) => raw.push({ kind: "drop3", cells: place(tuning, strs, DROP3[inv].map((i) => close[i])) })));
  if (want.has("shell")) SHELLS.forEach(([strs, ord]) => raw.push({ kind: "shell", cells: place(tuning, strs, ord.map((i) => pcs[i])) }));
  const out = [];
  raw.forEach((r) => [0, 12].forEach((k) => {
    if (!r.cells || (k && !up)) return;
    const cells = r.cells.map((c) => ({ s: c.s, f: c.f + k }));
    if (cells.some((c) => c.f > tuning.frets)) return;
    out.push(cardOf(tuning, x, r, cells, k));
  }));
  return out;
}

// v0.43's Frets filter values (Build C: the bar's fret range took its place), so an old link is still read.
export const CH_FRETS = [["any", "Any"], ["open", "Open"], ["1-5", "1–5"], ["5-9", "5–9"], ["9-13", "9–13"], ["12", "12+"]];
const KIND_ORD = Object.fromEntries(CH_TYPE_KEYS.map((k, i) => [k, i]));
// Card order (Identify's shapes): low fret to high, then the lower bass string, then type, then
// inversion.
export const chSort = (a, b) => a.lo - b.lo || b.bassStr - a.bassStr || KIND_ORD[a.kind] - KIND_ORD[b.kind] || a.inv - b.inv || a.k - b.k;
