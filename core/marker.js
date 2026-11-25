// Shared core · note markers (Build A, E9 model, TC 25 Nov). A note marker is a rounded square: the corner is 27 % of the side
// (the .tile class). The root is the same tile with a 2 px ink frame inside its edge (the .froot class), so the frame takes any
// fill: solid, a two-window split or the hatch. Inlays stay round.
export const TILE = "tile";
export const ROOT = "tile froot";
// An outline of width w in the element's fill (outlined shapes on the Chord tab's In key ladder): the fill shows only in the
// padding ring, so a split fill outlines in both colours.
export function outlineMask(w) {
  const m = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";
  return { padding: w, WebkitMask: m, WebkitMaskComposite: "xor", mask: m, maskComposite: "exclude" };
}
