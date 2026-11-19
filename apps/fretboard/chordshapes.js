// Fretboard Trainer · the Atlas's chord shapes (Chords mode, app-structure plan step 6): every shape of one chord, root and
// quality, as cards. Shape kinds: CAGED forms, closed triads, drop 2 and drop 3 voicings, and shells. Closed, drop 2 and
// drop 3 shapes are placed as the Chords page places its ladders (v0.34 rules: each tone the next one above the string
// below, the inversion's tone in the bass); string sets, shell strings and the CAGED templates are six-string standard-tuning
// constants, redesigned with the other tunings (plan step 8). The tuning gives the open pitches and the fret count.
import { DEG_LABEL, DEG_OVERRIDE, scopeIntervals } from "../../core/scales.js";
import { KEY_NAME, LETTERS } from "../../core/notes.js";
import { accs, spellAt } from "../../core/spelling.js";
import { QUAL_COMMON, QUAL_MORE, QUAL_T, DROP2, DROP3, INV_NAME7 } from "../../core/chords.js";
import { POS_MAJOR, POS_MINOR, CAGED_ANCHOR, cagedForms } from "./caged.js";

// Voicing types: key, button label, short name (phone bar, summary). Buttons and cards use the standard terms in full
// (TC, 19 Nov); the definitions sit under the buttons and in Help.
export const CH_TYPES = [["caged", "CAGED forms", "CAGED"], ["triad", "Closed triads", "Triads"], ["drop2", "Drop 2 voicings", "Drop 2"], ["drop3", "Drop 3 voicings", "Drop 3"], ["shell", "Shells (R 3 7)", "Shells"]];
export const CH_TYPE_KEYS = CH_TYPES.map(([k]) => k);
export const CH_TYPE_DEF = {
  caged: ["CAGED forms", "the five open-chord shapes (C, A, G, E, D) moved up the neck, one per window."],
  triad: ["Closed triads", "the three notes as close as they go, on three adjacent strings."],
  drop2: ["Drop 2", "a close 4-note chord with its 2nd note from the top moved down an octave."],
  drop3: ["Drop 3", "a close 4-note chord with its 3rd note from the top moved down an octave (one string skipped)."],
  shell: ["Shells", "root, 3rd and 7th only, root in the bass."],
};
const CARD_NAME = { triad: "Closed triad", drop2: "Drop 2 voicing", drop3: "Drop 3 voicing", shell: "Shell voicing" };
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
// Which types a quality has: CAGED forms for the five above; closed triads for 3-note chords; drop 2 and drop 3 for 4-note
// chords; shells for sevenths with a 3rd.
export function chAvail(q) {
  const n = chIvs(q).length;
  return CH_TYPE_KEYS.filter((t) => (t === "caged" ? !!CAGED[q] : t === "triad" ? n === 3 : t === "drop2" || t === "drop3" ? n === 4 : SHELL_Q.includes(q)));
}

// String sets, low string first, by string index (0 = string 1). Six-string guitar constants (plan step 8).
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
export function chordCards(tuning, root, q, types, up) {
  const ivs = chIvs(q), pcs = ivs.map((iv) => (root + iv) % 12), ton = chTon(q);
  const posList = ton === "major" ? POS_MAJOR : POS_MINOR;
  const base = (p) => (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
  const winOf = (cells) => { const p = posList.find((w) => cells.every((c) => ((((c.f - base(w)) % 12) + 12) % 12) <= w.w)); return p ? p.num : null; };
  const rn = chRootName(root, q), li = LETTERS.indexOf(rn[0]), sfx = chSuffix(q);
  const degKey = q === "major" || q === "minor" ? "triad" : q;
  const deg = (iv) => (DEG_OVERRIDE[degKey] && DEG_OVERRIDE[degKey][iv]) || DEG_LABEL[iv];
  const name = (pc) => { const d = /(\d)$/.exec(deg((((pc - root) % 12) + 12) % 12)); return accs(spellAt(li + (d ? +d[1] : 1) - 1, pc)); };
  const raw = [];
  const want = new Set(types.filter((t) => chAvail(q).includes(t)));
  if (want.has("caged") && tuning.id === "std") Object.entries(CAGED[q]).forEach(([L, tpl]) => {
    const t = (((root - CAGED_HOME[L]) % 12) + 12) % 12;
    const cells = [];
    tpl.forEach((f, i) => { if (f !== null) cells.push({ s: tuning.strings - 1 - i, f: f + t }); });
    raw.push({ kind: "caged", form: L, cells });
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
    cells.forEach((c) => { c.iv = (((tuning.open[c.s] + c.f - root) % 12) + 12) % 12; });
    const bass = cells.reduce((a, c) => (tuning.openAbs[c.s] + c.f < tuning.openAbs[a.s] + a.f ? c : a));
    const inv = ivs.indexOf(bass.iv);
    const frets = Array.from({ length: tuning.strings }, (_, s) => { const c = cells.find((x) => x.s === s); return c ? c.f : null; });
    const fs = cells.map((c) => c.f), fretted = fs.filter((f) => f > 0);
    const tok = strTok(cells.map((c) => c.s));
    const strsLow = [...cells].sort((a, b) => b.s - a.s).map((c) => c.s);
    const pos = r.kind === "caged" ? CAGED_NUM[r.form] : winOf(cells);
    const forms = r.kind === "caged" ? [r.form] : chordForms(root, ton, q, cells);
    const id = (r.kind === "caged" ? "c" + r.form : { triad: "t", drop2: "d", drop3: "e", shell: "s" }[r.kind] + tok + inv) + (k ? "u" : "");
    const title = rn + sfx + (inv > 0 ? "/" + name((root + ivs[inv]) % 12) : "") + (k ? " · 12 up" : "");
    out.push({
      id, kind: r.kind, form: r.form || null, forms, k, cells, frets, tok, inv, pos, bassStr: strsLow[0],
      lo: Math.min(...fs), hi: Math.max(...fs), span: fretted.length ? Math.max(...fretted) - Math.min(...fretted) + 1 : 0,
      open: fs.some((f) => f === 0), root, q, title,
      sub: [...frets].reverse().map((f) => (f === null ? "x" : f)).join(" "),
      mark: r.kind === "caged" ? `CAGED ${r.form} form` : CARD_NAME[r.kind],
      tags: r.kind === "caged" ? [`Window ${pos}`] : [INV_LABEL[inv], `Strings ${strLabel(tok)}`],
      deg, name,
    });
  }));
  return out;
}

// Frets filter (mock-up): Open = every note within frets 0–4 and at least one open string; a range = every note inside it,
// open strings counting as fret 0; 12+ = every note at fret 12 or higher.
export const CH_FRETS = [["any", "Any"], ["open", "Open"], ["1-5", "1–5"], ["5-9", "5–9"], ["9-13", "9–13"], ["12", "12+"]];
export function fretsOk(c, fr) {
  if (fr === "any") return true;
  if (fr === "open") return c.open && c.hi <= 4;
  if (fr === "12") return c.lo >= 12;
  const [a, b] = fr.split("-").map(Number);
  return c.lo >= a && c.hi <= b;
}
// The filters, in order. inv: null or 0–3; set: a strings token or null; open: "allow" or "none"; span: the most frets a
// shape may cover with fretted notes.
export function chFilter(cards, f) {
  return cards.filter((c) => (f.inv === null || c.inv === f.inv) && fretsOk(c, f.frets) && (f.set === null || c.tok === f.set)
    && (f.open === "allow" || !c.open) && c.span <= f.span);
}
const KIND_ORD = Object.fromEntries(CH_TYPE_KEYS.map((k, i) => [k, i]));
// Card order inside a section: low fret to high (as Scales' Position layout), then the lower bass string, then type, then
// inversion.
export const chSort = (a, b) => a.lo - b.lo || b.bassStr - a.bassStr || KIND_ORD[a.kind] - KIND_ORD[b.kind] || a.inv - b.inv || a.k - b.k;
// Sections by Lay out by: Family (voicing type), Inversion, Strings (string set) or Position (the CAGED window that holds
// the whole shape; shapes in none come last).
export function chSections(cards, by) {
  const groups = new Map();
  const keyOf = (c) => (by === "family" ? KIND_ORD[c.kind] : by === "inversion" ? c.inv : by === "strings" ? c.tok : c.pos === null ? 9 : c.pos);
  cards.forEach((c) => { const k = keyOf(c); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); });
  const posList = cards.length && chTon(cards[0].q) === "minor" ? POS_MINOR : POS_MAJOR;
  const title = (k) => (by === "family" ? CH_TYPES[k][1].replace(" (R 3 7)", "") : by === "inversion" ? INV_LABEL[k] : by === "strings" ? `Strings ${strLabel(k)}`
    : k === 9 ? "Not in one window" : `Position ${k} ${posList.find((p) => p.num === k).letter}`);
  const strOrd = (t) => [t.length, +t[0], +t[t.length - 1]];
  const keys = [...groups.keys()].sort((a, b) => {
    if (by !== "strings") return a - b;
    const x = strOrd(a), y = strOrd(b);
    return x[1] - y[1] || x[0] - y[0] || x[2] - y[2];
  });
  return keys.map((k) => ({ key: String(k), title: title(k), cards: groups.get(k).sort(chSort) }));
}
