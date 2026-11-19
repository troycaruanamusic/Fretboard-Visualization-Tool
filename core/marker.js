// Shared core · dot masks. The root marker (Round 15) is one filled element with a radial mask: a solid centre, a thin
// see-through gap and an outer ring in the same fill, so the ring takes any fill (solid, a two-window split, the hatch).
const feather = 0.5;
export function ringMask(ring, gap) {
  const a = ring + gap;
  const m = `radial-gradient(closest-side, #000 calc(100% - ${a + feather}px), transparent calc(100% - ${a}px), transparent calc(100% - ${ring + feather}px), #000 calc(100% - ${ring}px))`;
  return { WebkitMaskImage: m, maskImage: m };
}
// An outline of width w in the element's fill (outlined shapes on the Chords page).
export function outlineMask(w) {
  const m = `radial-gradient(closest-side, transparent calc(100% - ${w + feather}px), #000 calc(100% - ${w}px))`;
  return { WebkitMaskImage: m, maskImage: m };
}
