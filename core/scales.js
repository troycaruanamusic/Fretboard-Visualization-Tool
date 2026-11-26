// Shared core · scales, modes, degree names and the NNS modal reference data.
export const DEG_LABEL = {0:"R",1:"♭2",2:"2",3:"♭3",4:"3",5:"4",6:"♭5",7:"5",8:"♭6",9:"6",10:"♭7",11:"7"};
// Degrees the formula names differently from the semitone default (TH-05). Keys: scale mode or chord quality.
// Build D (TC 26 Nov): Lydian dominant ♯4; altered as a dominant scale, R ♭2 ♯2 3 ♭5 ♯5 ♭7; diminished half-whole
// R ♭2 ♯2 3 ♯4 5 6 ♭7; whole tone R 2 3 ♯4 ♯5 ♭7. Phrygian dominant and diminished whole-half (R 2 ♭3 4 ♭5 ♭6 6 7) take the
// defaults. Note names follow these labels (the neck spells each note on its label's letter).
// Round E (TC 26 Nov): the added notes of add9, add11, m(add9) and m(add11) read 9 and 11, the chord's own intervals (Cadd9:
// R 3 5 9); sus2 and sus4 keep 2 and 4, which name the chord, and scales keep 2 and 4. A label's number may have two digits.
export const DEG_OVERRIDE = { lydian: {6:"♯4"}, aug: {8:"♯5"}, aug7: {8:"♯5"}, dim7: {9:"𝄫7"}, maj7s5: {8:"♯5"},
  lyddom: {6:"♯4"}, altered: {3:"♯2", 8:"♯5"}, dimhw: {3:"♯2", 6:"♯4"}, whole: {6:"♯4", 8:"♯5"},
  add9: {2:"9"}, madd9: {2:"9"}, add11: {5:"11"}, madd11: {5:"11"} };
export const MODE_NAME = { ionian:"Ionian", dorian:"Dorian", phrygian:"Phrygian", lydian:"Lydian", mixolydian:"Mixolydian", aeolian:"Aeolian", locrian:"Locrian", harmonic:"harmonic minor", melodic:"melodic minor",
  lyddom:"Lydian dominant", altered:"altered", phrdom:"Phrygian dominant", dimhw:"diminished (half-whole)", dimwh:"diminished (whole-half)", whole:"whole tone" };

export const KEY_DEG = {
  major: { 0: "1", 2: "2", 4: "3", 5: "4", 7: "5", 9: "6", 11: "7" },
  minor: { 0: "1", 2: "2", 3: "♭3", 5: "4", 7: "5", 8: "♭6", 10: "♭7" },
};

// The seven modes of major in parent order (IA-review decision 4), in any key, numbered from the mode root; harmonic and
// melodic minor under Other scales. A mode sets Major or Minor by its 3rd (Round 4b), so windows and chord tones follow it.
export const MODES = [["ionian","Ionian"],["dorian","Dorian"],["phrygian","Phrygian"],["lydian","Lydian"],["mixolydian","Mixolydian"],["aeolian","Aeolian"],["locrian","Locrian"]];
// Build D (TC 25 Nov, the parked scale types; 26 Nov: both diminished scales): Lydian dominant, altered, Phrygian dominant,
// diminished half-whole and whole-half, whole tone, after the two minor scales in the Scale menu.
export const OTHER_SCALES = [["harmonic","Harmonic minor"],["melodic","Melodic minor"],
  ["lyddom","Lydian dominant"],["altered","Altered"],["phrdom","Phrygian dominant"],["dimhw","Diminished (half-whole)"],["dimwh","Diminished (whole-half)"],["whole","Whole tone"]];
export const MODE_IV = {
  ionian: [0,2,4,5,7,9,11], lydian: [0,2,4,6,7,9,11], mixolydian: [0,2,4,5,7,9,10],
  aeolian: [0,2,3,5,7,8,10], dorian: [0,2,3,5,7,9,10], phrygian: [0,1,3,5,7,8,10], locrian: [0,1,3,5,6,8,10],
  harmonic: [0,2,3,5,7,8,11], melodic: [0,2,3,5,7,9,11],
  lyddom: [0,2,4,6,7,9,10], altered: [0,1,3,4,6,8,10], phrdom: [0,1,4,5,7,8,10],
  dimhw: [0,1,3,4,6,7,9,10], dimwh: [0,2,3,5,6,8,9,11], whole: [0,2,4,6,8,10],
};
// Major or Minor by the scale's 3rd: a major 3rd makes it major. For the modes and the two minor scales this is the third
// note, as before Build D; altered and half-whole diminished have a ♯2 there and a major 3rd after it, so they are major.
export const MODE_Q = (m) => (MODE_IV[m].includes(4) ? "major" : "minor");
// A scale's chord tones (TH-04): its 1, 3, 5 and 7, the third, fifth and seventh notes. The Build D scales take the chord
// each is played over instead (TC 26 Nov): 7 for Lydian dominant, Phrygian dominant and half-whole diminished; R 3 ♭7 for
// altered (both 5ths altered); dim7 for whole-half diminished (R ♭3 ♭5 6); 7♯5 for whole tone.
export const SCALE_CT = { lyddom: [0,4,7,10], phrdom: [0,4,7,10], altered: [0,4,10], dimhw: [0,4,7,10], dimwh: [0,3,6,9], whole: [0,4,8,10] };
export const scaleCT = (mode, ivs) => SCALE_CT[mode] || [ivs[0], ivs[2], ivs[4], ivs[6]];

export function scopeIntervals(t, scope, arp, mode) {
  if (scope === "arpeggio") {
    if (arp === "maj7") return [0,4,7,11];
    if (arp === "dom7") return [0,4,7,10];
    if (arp === "min7") return [0,3,7,10];
    if (arp === "m7b5") return [0,3,6,10];
    if (arp === "dim") return [0,3,6];
    if (arp === "dim7") return [0,3,6,9];
    if (arp === "aug") return [0,4,8];
    if (arp === "aug7") return [0,4,8,10];
    if (arp === "add9") return [0,4,7,2];
    if (arp === "add11") return [0,4,7,5];
    if (arp === "add13") return [0,4,7,9];
    if (arp === "m6") return [0,3,7,9];
    if (arp === "madd9") return [0,3,7,2];
    if (arp === "madd11") return [0,3,7,5];
    if (arp === "sus2") return [0,2,7];
    if (arp === "sus4") return [0,5,7];
    if (arp === "7sus4") return [0,5,7,10];
    return t === "major" ? [0,4,7] : [0,3,7];
  }
  if (scope === "pentatonic") return t === "major" ? [0,2,4,7,9] : [0,3,5,7,10];
  if (scope === "blues") return t === "major" ? [0,2,3,4,7,9] : [0,3,5,6,7,10];
  if (scope === "scale") return MODE_IV[mode] || (t === "major" ? [0,2,4,5,7,9,11] : [0,2,3,5,7,8,10]);
  return [0,2,3,4,5,7,9,10];
}
export const KEY_DEG_HM = { 0: "1", 2: "2", 3: "♭3", 5: "4", 7: "5", 8: "♭6", 11: "7" };

// Modes page (Round 6, IA-review mock-up F): the seven modes of one parent major key, each with its characteristic tone,
// a reverse lookup that finds the parent key, and a link from each row to that mode on the Neck page.
// MODE_REF and MODE_REF_OFF are copied verbatim from ChordCharts (NashvilleChartEditor.jsx at 3387f8d, `ModeReference`),
// so the two apps carry the same data and wording. Spelled with ♭ / ♯, as on the Chords page.
export const MODE_REF = {"keys": {"C": ["C", "D", "E", "F", "G", "A", "B"], "D♭": ["D♭", "E♭", "F", "G♭", "A♭", "B♭", "C"], "D": ["D", "E", "F♯", "G", "A", "B", "C♯"], "E♭": ["E♭", "F", "G", "A♭", "B♭", "C", "D"], "E": ["E", "F♯", "G♯", "A", "B", "C♯", "D♯"], "F": ["F", "G", "A", "B♭", "C", "D", "E"], "G♭": ["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"], "G": ["G", "A", "B", "C", "D", "E", "F♯"], "A♭": ["A♭", "B♭", "C", "D♭", "E♭", "F", "G"], "A": ["A", "B", "C♯", "D", "E", "F♯", "G♯"], "B♭": ["B♭", "C", "D", "E♭", "F", "G", "A"], "B": ["B", "C♯", "D♯", "E", "F♯", "G♯", "A♯"]}, "order": ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"], "modes": [{"deg": 1, "name": "Ionian", "quality": "Major", "formula": ["1", "2", "3", "4", "5", "6", "7"], "char": [3, 6], "solo": "1maj<sup>7</sup>", "vamp": "1 – 4 – 5", "color": "♮4 & ♮7 (reference major)", "avoid": "♮4 (11) → 3", "feel": "Plain major"}, {"deg": 2, "name": "Dorian", "quality": "Minor", "formula": ["1", "2", "♭3", "4", "5", "6", "♭7"], "char": [5], "solo": "1m<sup>7</sup>", "vamp": "1m – 4", "color": "♮6 (13)", "avoid": "none critical — ♮6 is the target", "feel": "Bright minor — folk-rock, funk, jam vamps"}, {"deg": 3, "name": "Phrygian", "quality": "Minor", "formula": ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"], "char": [1], "solo": "1m<sup>7</sup>", "vamp": "♭2 – 1m", "color": "♭2 (♭9)", "avoid": "♭2 unless ♭II present", "feel": "Dark, Spanish — metal, static minor"}, {"deg": 4, "name": "Lydian", "quality": "Major", "formula": ["1", "2", "3", "♯4", "5", "6", "7"], "char": [3], "solo": "1maj<sup>7♯11</sup>", "vamp": "1 – 2", "color": "♯4 (♯11)", "avoid": "none — ♯4 replaces the avoid note", "feel": "Dreamy, non-resolving major"}, {"deg": 5, "name": "Mixolydian", "quality": "Major", "formula": ["1", "2", "3", "4", "5", "6", "♭7"], "char": [6], "solo": "1<sup>7</sup>", "vamp": "1 – ♭7 – 4", "color": "♭7", "avoid": "♮4 (11) → 3", "feel": "Country/rock dominant — over I7 & V7"}, {"deg": 6, "name": "Aeolian", "quality": "Minor", "formula": ["1", "2", "♭3", "4", "5", "♭6", "♭7"], "char": [5], "solo": "1m<sup>7</sup>", "vamp": "1m – ♭6 – ♭7", "color": "♭6", "avoid": "♭6 → switch to Dorian if 4 is major", "feel": "Natural-minor songs, ballads"}, {"deg": 7, "name": "Locrian", "quality": "Diminished", "formula": ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"], "char": [4], "solo": "1m<sup>7♭5</sup>", "vamp": "1ø (rare as tonic)", "color": "♭5", "avoid": "♭2 → sub Locrian ♮2", "feel": "Half-diminished; brief/passing"}], "rootLabels": ["C", "D♭ / C♯", "D", "E♭ / D♯", "E", "F", "G♭ / F♯", "G", "A♭ / G♯", "A", "B♭ / A♯", "B"]};
export const MODE_REF_OFF = [0, 2, 4, 5, 7, 9, 11];
export const MODE_ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];
