// Fretboard Trainer · guitar tunings as data (tunings layer, app-structure plan step 5). Standard only for now; drop D, open
// and custom tunings follow at step 8.
import { makeTuning } from "../../core/tuning.js";

// e4 B3 G3 D3 A2 E2, string 1 first; 21 frets.
export const STANDARD = makeTuning({
  id: "std",
  name: "Standard",
  pitches: [64, 59, 55, 50, 45, 40],
  labels: ["e", "B", "G", "D", "A", "E"],
  gauges: [1.2, 1.6, 2.1, 2.6, 3.2, 3.8],
  frets: 21,
});
export const TUNINGS = [STANDARD];
