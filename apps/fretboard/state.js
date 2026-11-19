// Fretboard Trainer · shared state rules.
import { QUAL_T } from "../../core/chords.js";

// The chord kept on a Key, Major / Minor or Show change: in Any chord the quality stays, with its own Major / Minor where it
// has one (UX-10, UX-11; Major or Minor affects the key's chords and scales only, UX-16). Otherwise the key's tonic triad.
export const keepChord = (c, km) => (c.arpMode === "quality"
  ? { arp: c.arp, tonality: c.arp === "triad" ? c.tonality : QUAL_T[c.arp] || km }
  : { arp: "triad", tonality: km });
