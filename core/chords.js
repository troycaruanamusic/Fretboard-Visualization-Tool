// Shared core · chord formulas and names: qualities, diatonic triads and sevenths, voicing orders.
// One quality list for Major and Minor keys (UX-16): the common qualities, then the rest under More (IA-04, the ChordCharts
// keypad pattern). "Major" and "Minor" are the triad (arp "triad") with that 3rd. Every v0.30 quality is here.
export const QUAL_COMMON = [["major","Major"],["minor","Minor"],["dom7","7"],["maj7","maj7"],["min7","m7"],["sus4","sus4"]];
export const QUAL_MORE = [
  ["Triads", [["sus2","sus2"],["aug","aug"],["dim","dim"]], 3],
  ["Sevenths", [["7sus4","7sus4"],["m7b5","m7♭5"],["dim7","dim7"],["aug7","aug7"]], 4],
  ["Added notes", [["add13","6"],["add9","add9"],["add11","add11"],["m6","m6"],["madd9","m(add9)"],["madd11","m(add11)"]], 3],
];
export const QUAL_IN_MORE = (arp) => QUAL_MORE.some(([, qs]) => qs.some(([k]) => k === arp));
// A quality with a 3rd fixes the chord's Major / Minor, which picks its position windows as in v0.30 (maj7 was a major-key
// chord, m7 a minor-key one). sus2, sus4, 7sus4, dim, m7♭5 and dim7 were in both lists and keep the current one.
export const QUAL_T = { dom7:"major", maj7:"major", aug:"major", aug7:"major", add9:"major", add11:"major", add13:"major", min7:"minor", m6:"minor", madd9:"minor", madd11:"minor" };
// Header summary names (UX-07).
export const QUAL_NAME = { maj7:"maj7", dom7:"7", min7:"m7", m7b5:"m7♭5", dim7:"dim7", aug7:"aug7", add9:"add9", add11:"add11", add13:"6", m6:"m6", madd9:"m(add9)", madd11:"m(add11)", sus2:"sus2", sus4:"sus4", "7sus4":"7sus4" };

export const DIATONIC = {
  major: [["I",0,"maj"],["ii",2,"min"],["iii",4,"min"],["IV",5,"maj"],["V",7,"maj"],["vi",9,"min"],["vii°",11,"dim"]],
  minor: [["i",0,"min"],["ii°",2,"dim"],["III",3,"maj"],["iv",5,"min"],["v",7,"min"],["VI",8,"maj"],["♭VII",10,"maj"]],
};
export const INV_NAME = ["root position", "1st inversion", "2nd inversion"];
const TRIAD_Q = { maj: ["major", ""], min: ["minor", "m"], dim: ["diminished", "°"] };
// Sevenths (Round 8): the diatonic seventh chords of the key's Ionian or Aeolian degrees, as drop-2 voicings on a
// four-string set. Inversions are named by the bass note, as for triads: low to high, root position R 5 7 3, 1st 3 7 R 5,
// 2nd 5 R 3 7, 3rd 7 3 5 R (chord-tone indices 0 R, 1 3rd, 2 5th, 3 7th).
export const INV_NAME7 = [...INV_NAME, "3rd inversion"];
const SEV_Q = { maj7: ["major 7th", "maj7"], m7: ["minor 7th", "m7"], dom7: ["dominant 7th", "7"], m7b5: ["half-diminished 7th", "m7♭5"],
  mmaj7: ["minor-major 7th", "m(maj7)"], maj7s5: ["augmented major 7th", "maj7♯5"], dim7: ["diminished 7th", "dim7"] };
export const CH_Q = { ...TRIAD_Q, ...SEV_Q };
// Harmonic minor (Round 10): Sevenths in a minor key may take the sevenths of harmonic minor, with its raised 7th.
// Triads stay natural minor.
export const DIATONIC7 = {
  major: [["Imaj7","maj7"],["ii7","m7"],["iii7","m7"],["IVmaj7","maj7"],["V7","dom7"],["vi7","m7"],["viiø7","m7b5"]],
  minor: [["i7","m7"],["iiø7","m7b5"],["IIImaj7","maj7"],["iv7","m7"],["v7","m7"],["VImaj7","maj7"],["♭VII7","dom7"]],
  harmonic: [["i(maj7)","mmaj7"],["iiø7","m7b5"],["III+maj7","maj7s5"],["iv7","m7"],["V7","dom7"],["VImaj7","maj7"],["vii°7","dim7"]],
};
export const DROP2 = [[0,2,3,1],[1,3,0,2],[2,0,1,3],[3,1,2,0]];
// Drop-3 (Round 10): a close voicing with its third note from the top dropped an octave, on strings 5 3 2 1 or 6 4 3 2
// (one string skipped). Named by the bass note, low to high: root position R 7 3 5, 1st 3 R 5 7, 2nd 5 3 7 R, 3rd 7 5 R 3.
export const DROP3 = [[0,3,1,2],[1,0,2,3],[2,1,3,0],[3,2,0,1]];
