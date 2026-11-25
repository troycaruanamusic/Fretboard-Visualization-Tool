// Fretboard Trainer · URL state: the parameter table, reading and writing.
import { same } from "../../core/util.js";
import { LETTERS, LETTER_PC } from "../../core/notes.js";
import { MODES, OTHER_SCALES } from "../../core/scales.js";
import { spellAt, normSpell } from "../../core/spelling.js";
import { QUAL_COMMON, QUAL_MORE, QUAL_T } from "../../core/chords.js";
import { NOTE_IN, noteTok, oneOf, intIn, listIn } from "../../core/link.js";
import { CH_QUALS, CH_TYPE_KEYS, CH_FRETS, chIvs, chTon } from "./chordshapes.js";
import { STANDARD } from "./tunings.js";
import { emptyShape, shapeTok, shapeIn } from "./identify.js";

const STR_TOK = ["13", "24", "35", "46"];
const STR7_TOK = ["14", "25", "36"];
const STR3_TOK = ["15", "26"];
const ARP_KEYS = ["triad", ...QUAL_COMMON.map(([k]) => k).filter((k) => k !== "major" && k !== "minor"), ...QUAL_MORE.flatMap(([, qs]) => qs.map(([k]) => k))];
// [parameter, state part, field, default, encode, decode]. Part "lg" holds v0.41 parameters that are read but never written
// (Build A): old links open the matching view, and the link is rewritten in the new form.
const URL_FIELDS = [
  // Build A (E9 model): four tabs. The v0.41 pages neck, chords and atlas are read and mapped in queryToState.
  ["p", "top", "page", "scale", String, oneOf("scale", "chord", "identify", "modes", "neck", "chords", "atlas")],
  // Chord tab: Show = Voicing | All positions | In key (mock-up call 6).
  ["cv", "top", "cshow", "voicing", String, oneOf("voicing", "all", "inkey")],
  ["key", "cfg", "keyRoot", 0, null, NOTE_IN],
  ["mode", "cfg", "keyMode", "major", String, oneOf("major", "minor")],
  ["show", "cfg", "scope", "pentatonic", String, oneOf("arpeggio", "pentatonic", "blended", "blues", "scale")],
  ["chord", "cfg", "arpMode", "diatonic", (v) => (v === "quality" ? "any" : "inkey"), (v) => ({ any: "quality", inkey: "diatonic" })[v]],
  ["q", "cfg", "arp", "triad", String, oneOf(...ARP_KEYS)],
  ["croot", "cfg", "root", 0, (v) => noteTok(v), NOTE_IN],
  ["cmode", "cfg", "tonality", "major", String, oneOf("major", "minor")],
  ["scale", "cfg", "mode", "ionian", String, oneOf(...MODES.map(([k]) => k), ...OTHER_SCALES.map(([k]) => k))],
  ["num", "cfg", "diaLabel", "key", String, oneOf("key", "chord")],
  ["pos", "cfg", "pos", null, String, (v) => (v === "all" ? "all" : intIn(1, 5)(v))],
  ["str", "cfg", "strGroup", null, (v) => STR_TOK[v], (v) => (STR_TOK.includes(v) ? STR_TOK.indexOf(v) : undefined)],
  ["focus", "cfg", "focus", [], (v) => v.join("."), listIn(0, 11)],
  ["labels", "top", "labelMode", "degree", String, oneOf("degree", "name", "none")],
  ["notes", "top", "isolate", false, () => "ct", (v) => (v === "ct" ? true : undefined)],
  ["other", "top", "ghost", false, () => "shown", (v) => (v === "shown" ? true : undefined)],
  ["dots", "top", "dotColour", "caged", String, oneOf("caged", "neutral")],
  ["deg", "ch", "deg", 0, (v) => String(v + 1), (v) => { const n = intIn(1, 7)(v); return n === undefined ? undefined : n - 1; }],
  ["set", "ch", "strSet", 0, (v) => STR_TOK[v], (v) => (STR_TOK.includes(v) ? STR_TOK.indexOf(v) : undefined)],
  ["inv", "ch", "inv", 0, String, intIn(0, 2)],
  ["chords", "ch", "sev", false, () => "7", (v) => (v === "7" ? true : undefined)],
  ["set7", "ch", "strSet7", 0, (v) => STR7_TOK[v], (v) => (STR7_TOK.includes(v) ? STR7_TOK.indexOf(v) : undefined)],
  ["inv7", "ch", "inv7", 0, String, intIn(0, 3)],
  ["drop", "ch", "drop3", false, () => "3", (v) => (v === "3" ? true : undefined)],
  ["set3", "ch", "strSet3", 0, (v) => STR3_TOK[v], (v) => (STR3_TOK.includes(v) ? STR3_TOK.indexOf(v) : undefined)],
  ["inv3", "ch", "inv3", 0, String, intIn(0, 3)],
  ["minor", "ch", "harm", false, () => "harmonic", (v) => (v === "harmonic" ? true : undefined)],
  ["behind", "lg", "behind", false, () => "shown", (v) => (v === "shown" ? true : undefined)],
  ["parent", "md", "parent", 0, (v) => noteTok(v), NOTE_IN],
  ["mview", "md", "view", "notes", String, oneOf("notes", "numbers")],
  ["find", "md", "lkRoot", "", (v) => noteTok(+v), (v) => { const n = NOTE_IN(v); return n < 0 ? undefined : String(n); }],
  ["findmode", "md", "lkMode", "", (v) => String(+v + 1), (v) => { const n = intIn(1, 7)(v); return n === undefined ? undefined : String(n - 1); }],
  ["hit", "md", "hit", null, (v) => String(v + 1), (v) => { const n = intIn(1, 7)(v); return n === undefined ? undefined : n - 1; }],
  ["open", "md", "open", [], (v) => v.map((i) => i + 1).join("."), (v) => { const a = listIn(1, 7)(v); return a && a.map((i) => i - 1); }],
  // The scale cards (Round 11; under the Scale tab's neck since Build A). Key, Major / Minor, Scale, Mode and Strings are the
  // bar's. lit is the lit card: a window number, a mode or a key, with u for its copy 12 up. v0.41's Atlas mode, Show,
  // Strings, Chord tones and Neck map are read only (lg).
  ["atlas", "lg", "am", "scales", String, oneOf("scales", "chords", "identify")],
  ["ashow", "lg", "show", "scale", String, oneOf("scale", "pentatonic", "blues")],
  ["by", "at", "by", "position", String, oneOf("position", "mode", "key")],
  ["apos", "at", "pos", 2, String, intIn(1, 5)],
  ["from", "at", "from", "root", String, oneOf("root", "parent")],
  ["astr", "lg", "str", null, (v) => STR_TOK[v], (v) => (STR_TOK.includes(v) ? STR_TOK.indexOf(v) : undefined)],
  ["copies", "at", "up", false, () => "12", (v) => (v === "12" ? true : undefined)],
  ["tones", "lg", "ct", "larger", String, oneOf("larger", "same")],
  ["size", "at", "size", "standard", String, oneOf("standard", "large")],
  ["map", "lg", "map", null, (v) => (v ? "on" : "off"), (v) => ({ on: true, off: false })[v]],
  ["lit", "at", "lit", null, String, (v) => (/^[A-Za-z0-9]{1,12}$/.test(v) ? v : undefined)],
  // Chord tab, Voicing (Round 14's Chords mode): Lay out by, voicing types (listed in their button order; all on is the
  // default), the filters and the lit card (a shape id: kind, strings, inversion, u for its copy 12 up). The chord is the
  // Chord tab's one Root and Quality (croot, q, cmode above); v0.41's own Atlas chord (achord, aq) is read only.
  ["achord", "lg", "croot", 0, (v) => noteTok(v), NOTE_IN],
  ["aq", "lg", "cq", "major", String, oneOf(...CH_QUALS.map(([k]) => k))],
  ["cby", "at", "cby", "family", String, oneOf("family", "inversion", "strings", "position")],
  ["vt", "at", "vt", CH_TYPE_KEYS, (v) => (v.length ? v.join(".") : "none"), (v) => (v === "none" ? [] : ((a) => (a.every((t) => CH_TYPE_KEYS.includes(t)) && new Set(a).size === a.length ? CH_TYPE_KEYS.filter((t) => a.includes(t)) : undefined))(v.split(".")))],
  ["ainv", "at", "cinv", null, (v) => ["root", "1", "2", "3"][v], (v) => { const i = ["root", "1", "2", "3"].indexOf(v); return i < 0 ? undefined : i; }],
  ["frets", "at", "frets", "any", String, oneOf(...CH_FRETS.map(([k]) => k).filter((k) => k !== "any"))],
  ["aset", "at", "cset", null, String, (v) => (/^[1-6]{3,6}$/.test(v) && [...v].every((d, i) => !i || d > v[i - 1]) ? v : undefined)],
  ["aopen", "at", "copen", "allow", String, oneOf("none")],
  ["span", "at", "span", 4, String, intIn(3, 6)],
  ["acopies", "at", "cup", false, () => "12", (v) => (v === "12" ? true : undefined)],
  ["clit", "at", "clit", null, String, (v) => (/^[A-Za-z0-9]{1,12}$/.test(v) ? v : undefined)],
  // Identify (Round 16): its own shape (frets low string to high, x muted: x.3.2.0.1.0) and the chosen name (root and
  // quality: A.min7); with no name the shape's first name is chosen. Standard tuning: the app's only tuning (TC, 25 Nov).
  ["ishape", "at", "ishape", emptyShape(STANDARD), shapeTok, (v) => shapeIn(v, STANDARD)],
  ["iname", "at", "iname", null, (v) => { const [r, q] = v.split("."); return noteTok(+r) + "." + q; }, (v) => {
    const m = /^([A-G][bs]?)\.([A-Za-z0-9]+)$/.exec(v), r = m ? NOTE_IN(m[1]) : -1;
    return r >= 0 && CH_QUALS.some(([k]) => k === m[2]) ? `${r}.${m[2]}` : undefined;
  }],
];
const URL_DEFAULT = {
  top: { page: "scale", cshow: "voicing", labelMode: "degree", isolate: false, ghost: false, dotColour: "caged", more: false },
  cfg: { root: 0, tonality: "major", scope: "pentatonic", arp: "triad", pos: null, focus: [], keyRoot: 0, keyMode: "major", arpMode: "diatonic", diaLabel: "key", strGroup: null, mode: "ionian", keySpell: null },
  ch: { deg: 0, strSet: 0, inv: 0, sev: false, strSet7: 0, inv7: 0, drop3: false, strSet3: 0, inv3: 0, harm: false },
  md: { parent: 0, view: "notes", hit: null, lkRoot: "", lkMode: "", open: [] },
  at: { by: "position", pos: 2, from: "root", up: false, size: "standard", lit: null,
    cby: "family", vt: CH_TYPE_KEYS, cinv: null, frets: "any", cset: null, copen: "allow", span: 4, cup: false, clit: null,
    ishape: emptyShape(STANDARD), iname: null },
  lg: { behind: false, am: "scales", show: "scale", str: null, ct: "larger", map: null, croot: 0, cq: "major" },
};
// The Chord tab's quality as one key: the triads by their 3rd, else the Any chord quality.
export const chordQ = (c) => (c.arp === "triad" ? c.tonality : c.arp);
// A quality as the chord state holds it (the Neck's Any chord rule): a triad by its 3rd, a quality with a 3rd takes its own.
export const qualPatch = (q, ton) => (q === "major" || q === "minor" ? { arp: "triad", tonality: q } : { arp: q, tonality: QUAL_T[q] || ton });
export function stateToQuery(st) {
  const q = new URLSearchParams();
  URL_FIELDS.forEach(([k, part, f, d, enc]) => {
    if (part === "lg") return;
    const v = st[part][f];
    if (!same(v, d) || (k === "key" && st.cfg.keySpell)) q.set(k, enc ? enc(v) : st.cfg.keySpell ? spellAt(LETTERS.indexOf(st.cfg.keySpell), v).replace("#", "s") : noteTok(v, st.cfg.keyMode));
  });
  // More (Build A): the bar's More panel, open or not.
  if (st.top.more) q.set("more", "1");
  const t = q.toString();
  return t ? "?" + t : "";
}
export function queryToState(search) {
  const q = new URLSearchParams(search);
  const st = { top: { ...URL_DEFAULT.top }, cfg: { ...URL_DEFAULT.cfg }, ch: { ...URL_DEFAULT.ch }, md: { ...URL_DEFAULT.md }, at: { ...URL_DEFAULT.at }, lg: { ...URL_DEFAULT.lg } };
  URL_FIELDS.forEach(([k, part, f, d, , dec]) => {
    if (!q.has(k)) return;
    const v = dec(q.get(k));
    if (v !== undefined && !(typeof v === "number" && v < 0)) st[part][f] = v;
  });
  // A key written with another letter than the standard name (key=Gb, key=Cb, key=Ds) carries that letter while it costs
  // no more accidentals than the automatic one (Round 9). Any letter with one accidental at most is read.
  const kt = /^([A-G])(b|s)?$/.exec(q.get("key") || "");
  if (kt) {
    const pc = (LETTER_PC[LETTERS.indexOf(kt[1])] + (kt[2] === "b" ? 11 : kt[2] === "s" ? 1 : 0)) % 12;
    st.cfg = normSpell({ ...st.cfg, keyRoot: pc, keySpell: kt[1] });
  }
  // v0.41 links (Build A): each page opens the tab that now holds it. The key letter above was settled as v0.41 settled it
  // (under the Neck's layer); it is checked again for the layer the tab now shows, so the rewritten link opens the same.
  //   Neck: Show: Chord → Chord, All positions; any other Show → Scale.  Chords → Chord, In key.
  //   Atlas: Scales → Scale (its Show and Strings become the bar's); Chords → Chord, Voicing (its chord becomes the Chord
  //   tab's); Identify → Identify.  Modes → Modes.
  // Show: Chord is no longer a scale layer: the Scale tab keeps the default layer and the chord stays in croot, q, cmode.
  const raw = q.has("p") ? st.top.page : "neck";
  const arp = st.cfg.scope === "arpeggio";
  if (arp) st.cfg.scope = URL_DEFAULT.cfg.scope;
  if (raw === "neck") { st.top.page = arp ? "chord" : "scale"; if (arp) st.top.cshow = "all"; }
  else if (raw === "chords") { st.top.page = "chord"; st.top.cshow = "inkey"; }
  else if (raw === "atlas") {
    const am = st.lg.am;
    if (am === "scales") { st.top.page = "scale"; st.cfg.scope = st.lg.show; st.cfg.strGroup = st.lg.str; }
    else if (am === "chords") {
      st.top.page = "chord"; st.top.cshow = "voicing";
      st.cfg = { ...st.cfg, root: st.lg.croot, arpMode: "quality", ...qualPatch(st.lg.cq, chTon(st.lg.cq)) };
    } else st.top.page = "identify";
  }
  st.cfg = normSpell(st.cfg);
  // A hand-edited link: a quality with a 3rd takes its own Major / Minor, as a click would.
  if (st.cfg.arp !== "triad" && QUAL_T[st.cfg.arp]) st.cfg.tonality = QUAL_T[st.cfg.arp];
  st.top.more = q.get("more") === "1";
  // Lay out by Mode is for Scale with a mode; a hand-edited link with another layer falls back to Position, as the control does.
  if (st.at.by === "mode" && st.cfg.scope !== "scale") st.at.by = "position";
  // A 3-note chord has no 3rd inversion; the control drops it, so a hand-edited link does too.
  if (st.at.cinv === 3 && chIvs(chordQ(st.cfg)).length === 3) st.at.cinv = null;
  return st;
}
export const URL_INIT = typeof location !== "undefined" ? queryToState(location.search) : queryToState("");
