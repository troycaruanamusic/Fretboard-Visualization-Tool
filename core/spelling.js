// Shared core · note spelling: key signatures, root letters, ♭ / ♯ and doubles.
import { KEY_NAME, LETTERS, LETTER_PC } from "./notes.js";
import { MODE_IV } from "./scales.js";

// Neck spelling with ♭ / ♯, and 𝄫 / 𝄪 for doubles (Round 6b, Round 4b item 6). Spelling logic stays in b / #.
export const accs = (s) => s.replace(/bb/g, "𝄫").replace(/##/g, "𝄪").replace(/b/g, "♭").replace(/#/g, "♯");
// Letter index li (0 = C, wraps) plus the accidental that reaches pitch class pc.
export const spellAt = (li, pc) => {
  const l = ((li % 7) + 7) % 7;
  let d = (((pc - LETTER_PC[l]) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  return LETTERS[l] + (d > 0 ? "#".repeat(d) : "b".repeat(-d));
};
// The seven notes of the key (Ionian or Aeolian), spelled from the key signature (TH-01). The Neck may pass its own root
// letter (Round 9); the Chords page keeps the 24 standard key names.
export function keySpelling(keyRoot, keyMode, letter = LETTERS.indexOf(KEY_NAME[keyMode][keyRoot][0])) {
  const li = letter;
  const map = {};
  MODE_IV[keyMode === "major" ? "ionian" : "aeolian"].forEach((s, k) => {
    const pc = (keyRoot + s) % 12;
    map[pc] = { name: spellAt(li + k, pc), letter: li + k };
  });
  return map;
}

// Neck root spelling (Round 9). A root may take any letter that reaches it with one accidental at most (F♯ or G♭, B or C♭).
// The Neck picks the letter that spells the scale shown with the fewest accidentals (𝄫 and 𝄪 count two): the mode or
// other scale in a Scale layer, otherwise the key (Ionian or Aeolian). A tie keeps the standard key name (KEY_NAME).
// A Modes row link may carry its own letter (keySpell) for a tie, G♭ Ionian, A♭ Dorian, C♭ Lydian; it never costs more.
const accCount = (s) => (s.match(/[#b]/g) || []).length;
const spellIvs = (c) => (c.scope === "scale" ? MODE_IV[c.mode] : MODE_IV[c.keyMode === "major" ? "ionian" : "aeolian"]);
const spellCost = (li, pc, ivs) => ivs.reduce((n, iv, k) => n + accCount(spellAt(li + k, (pc + iv) % 12)), 0);
const okLetter = (li, pc) => accCount(spellAt(li, pc)) <= 1;
export function autoLetter(pc, c) {
  const ivs = spellIvs(c), std = LETTERS.indexOf(KEY_NAME[c.keyMode][pc][0]);
  let best = std, cost = spellCost(std, pc, ivs);
  for (let li = 0; li < 7; li++) if (okLetter(li, pc) && spellCost(li, pc, ivs) < cost) { best = li; cost = spellCost(li, pc, ivs); }
  return best;
}
const keySpellLi = (c) => (c.keySpell ? LETTERS.indexOf(c.keySpell) : -1);
export const neckLetter = (c) => (keySpellLi(c) >= 0 ? keySpellLi(c) : autoLetter(c.keyRoot, c));
// A carried letter holds while it is not the standard name and costs no more than the automatic one; otherwise it is
// dropped, so the state never holds a letter that has no effect. A Key change drops it too (in the app's update).
export function normSpell(c) {
  if (!c.keySpell) return c;
  const li = LETTERS.indexOf(c.keySpell), ivs = spellIvs(c);
  const keep = li >= 0 && okLetter(li, c.keyRoot) && li !== LETTERS.indexOf(KEY_NAME[c.keyMode][c.keyRoot][0])
    && spellCost(li, c.keyRoot, ivs) <= spellCost(autoLetter(c.keyRoot, c), c.keyRoot, ivs);
  return keep ? c : { ...c, keySpell: null };
}

// Chords page (Round 5, IA-review mock-ups D and E): the seven diatonic triads of the key as closed voicings on one
// three-string set, all seven on the neck at once, the chosen one filled and the rest outlined, Roman numerals above.
// Sevenths (Round 8, IA-review decision 5): drop-2 on four-string sets. Key and Major / Minor are shared with the Neck page.
// Names on this page use ♭ / ♯ (Round 5); the Neck page keeps b / # until Round 4b item 6 is decided there.
export const uniAcc = (s) => s.replace(/b/g, "♭").replace(/#/g, "♯");
// The key signature with the raised 7th (A minor: G♯; G♯ minor: F𝄪), for harmonic minor on the Chords page.
export function hmSpelling(keyRoot) {
  const li = LETTERS.indexOf(KEY_NAME.minor[keyRoot][0]), map = {};
  MODE_IV.harmonic.forEach((s, k) => { const pc = (keyRoot + s) % 12; map[pc] = { name: spellAt(li + k, pc), letter: li + k }; });
  return map;
}
