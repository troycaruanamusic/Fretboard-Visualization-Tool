// Shared core · the tuning object every string-instrument app uses: strings listed from the top of the board down (string 1
// first), each with its open pitch as a MIDI number, its label and its drawn gauge, plus the instrument's fret count.
// Open pitch classes are derived from the MIDI numbers. Strings may come in any pitch order (re-entrant tunings), so code
// that needs pitch order reads openAbs, never the string index.
export function makeTuning({ id, name, pitches, labels, gauges, frets }) {
  const n = pitches.length;
  if (!id || !name) throw new Error("tuning: id and name are required");
  if (!n || labels.length !== n || gauges.length !== n) throw new Error(`tuning ${id}: pitches, labels and gauges need one entry per string`);
  if (!Number.isInteger(frets) || frets < 1) throw new Error(`tuning ${id}: fret count must be a whole number of 1 or more`);
  return Object.freeze({
    id, name, frets,
    strings: n,
    openAbs: Object.freeze([...pitches]),
    open: Object.freeze(pitches.map((m) => ((m % 12) + 12) % 12)),
    labels: Object.freeze([...labels]),
    gauges: Object.freeze([...gauges]),
  });
}
