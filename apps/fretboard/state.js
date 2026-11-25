// Fretboard Trainer · shared state rules.
import { QUAL_T } from "../../core/chords.js";

// The chord kept on a Key, Major / Minor or Show change: in Any chord the quality stays, with its own Major / Minor where it
// has one (UX-10, UX-11; Major or Minor affects the key's chords and scales only, UX-16). Otherwise the key's tonic triad.
export const keepChord = (c, km) => (c.arpMode === "quality"
  ? { arp: c.arp, tonality: c.arp === "triad" ? c.tonality : QUAL_T[c.arp] || km }
  : { arp: "triad", tonality: km });

// A Key or Major / Minor change (Build A). The Chord tab's chord has its own Root since the tabs split (TC, 25 Nov: one chord
// for Voicing and All positions), so it follows the key only when it is picked from the key (In key degrees): then it goes
// back to the key's tonic triad, as in v0.41. An Any chord keeps its root and quality. km: the Major / Minor after the change.
export const keyPatch = (c, p, km = p.keyMode || c.keyMode) => {
  const n = { ...c, ...p };
  return c.arpMode === "diatonic" ? { ...n, root: n.keyRoot, ...keepChord(c, km) } : n;
};
