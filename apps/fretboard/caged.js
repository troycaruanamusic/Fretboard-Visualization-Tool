// Fretboard Trainer · CAGED windows, dot colours and chord forms.
// Colours are theme variables (Round 15; values per theme in design.css). Neutral dots (DS-05): a value step, chord tones
// light and other scale tones muted, both with ink labels.
export const NEUTRAL_CT = "var(--n-ct)", NEUTRAL_OTHER = "var(--n-other)";
const LETTERS5 = ["C", "A", "G", "E", "D"];
// Calmer CAGED set (decision 7 = b), all with ink labels (DS-04); deeper shades in Light and High contrast.
export const POS_COLOR = Object.fromEntries(LETTERS5.map((L) => [L, `var(--c-${L})`]));
// Nut-substitute hatch: the second stripe per position colour.
export const HATCH = Object.fromEntries(LETTERS5.map((L) => [L, `var(--h-${L})`]));
// The All view's 12 % column tint, per position colour.
export const POS_TINT = Object.fromEntries(LETTERS5.map((L) => [L, `color-mix(in srgb, var(--c-${L}) 12%, transparent)`]));
// Window offsets count from the pitch class of standard tuning's low E (4). Kept as a CAGED constant, not read from the
// tuning; the app is standard tuning only (TC, 25 Nov: build plan step 8, other tunings, dropped).
export const CAGED_ANCHOR = 4;
export const POS_MAJOR = [{num:1,letter:"C",off:4,w:3},{num:2,letter:"A",off:6,w:3},{num:3,letter:"G",off:9,w:3},{num:4,letter:"E",off:-1,w:3},{num:5,letter:"D",off:1,w:4}];
export const POS_MINOR = [{num:1,letter:"C",off:4,w:4},{num:2,letter:"A",off:7,w:3},{num:3,letter:"G",off:9,w:3},{num:4,letter:"E",off:0,w:3},{num:5,letter:"D",off:2,w:3}];

// A fret's phase in window p of root: 0 at the window's low edge.
const phaseOf = (root, f, p) => ((((f - ((((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12)) % 12) + 12) % 12);
// The windows that hold a fret, the lower one first (the neck's split order). Moved from the Scale list (Round E).
export const winsAt = (root, posList, f) => posList.filter((p) => phaseOf(root, f, p) <= p.w).sort((a, b) => phaseOf(root, f, b) - phaseOf(root, f, a));
// The Scale list's Position column: the fewest windows that hold every note, chosen greedily (most notes first, the lower
// number on a tie).
export function coverWins(root, posList, cells) {
  const left = cells.map((c) => winsAt(root, posList, c.f));
  const out = [];
  while (left.some((ws) => ws.length)) {
    let best = null, n = 0;
    posList.forEach((p) => { const k = left.filter((ws) => ws.includes(p)).length; if (k > n) { best = p; n = k; } });
    out.push(best);
    left.forEach((ws, i) => { if (ws.includes(best)) left[i] = []; });
  }
  return out.sort((a, b) => a.num - b.num);
}

// CAGED form of a chord voicing (Round 15): the windows of the chord's own root that hold every note of the shape, the
// window whose low edge sits nearest below the shape's lowest note first. cells: [{s, f}].
export function cagedFit(root, ton, cells) {
  const list = ton === "minor" ? POS_MINOR : POS_MAJOR;
  const ph = (f, p) => (((f - root + CAGED_ANCHOR - p.off) % 12) + 12) % 12;
  const lo = Math.min(...cells.map((c) => c.f));
  return list.filter((p) => cells.every((c) => ph(c.f, p) <= p.w)).sort((a, b) => ph(lo, b) - ph(lo, a)).map((p) => p.letter);
}
// A shape in no window of its own major / minor takes the other set's windows, for colour only.
export function cagedForms(root, ton, cells) {
  const f = cagedFit(root, ton, cells);
  return f.length ? f : cagedFit(root, ton === "minor" ? "major" : "minor", cells);
}
// One form: its colour; two: a diagonal split; none: neutral.
export const formFill = (forms, neutral = NEUTRAL_CT) => forms.length > 1
  ? `linear-gradient(135deg, ${POS_COLOR[forms[0]]} 0 50%, ${POS_COLOR[forms[1]]} 50% 100%)`
  : forms.length ? POS_COLOR[forms[0]] : neutral;
export const formName = (forms) => forms.length ? forms.join("/") + " form" : "";
// The windows a voicing sits in, for the Voicing neck's ruler (Round E, TC 26 Nov): every window of the chord's own Major /
// Minor set that holds the whole shape (two where two do); where none does, the fewest that hold it together, as the Scale
// list covers a path. Returns window numbers.
export function voicingWins(root, ton, cells) {
  const list = ton === "minor" ? POS_MINOR : POS_MAJOR;
  const whole = list.filter((p) => cells.every((c) => phaseOf(root, c.f, p) <= p.w));
  return (whole.length ? whole : coverWins(root, list, cells)).map((p) => p.num).sort((a, b) => a - b);
}
