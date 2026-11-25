// Fretboard Trainer · the Scale tab (Build A, E9 model): Key, Scale and Mode in the bar, the neck, and the scale cards under it
// (v0.41's Atlas Scales, until the path list of Build B).
import { MODES, MODE_Q } from "../../core/scales.js";
import { Grp, Sel } from "../../core/ui.jsx";
import { Board, KeyGroup } from "./neck.jsx";
import { ScaleCards } from "./atlas.jsx";
import { keyPatch } from "./state.js";

// Scale (mock-up call 5): the layers and the two minor scales in one menu. "Scale" is the seven modes, chosen under Mode.
const SCALES = [["scale", "Scale"], ["pentatonic", "Pentatonic"], ["blues", "Blues"], ["blended", "Major and minor"], ["harmonic", "Harmonic minor"], ["melodic", "Melodic minor"]];
const MINOR_SCALES = ["harmonic", "melodic"];
export const scaleValue = (cfg) => (cfg.scope === "scale" && MINOR_SCALES.includes(cfg.mode) ? cfg.mode : cfg.scope);

// A mode or minor scale with the other 3rd switches Major / Minor (Round 4b).
const modePatch = (cfg, k) => { const q = MODE_Q(k); return q === cfg.keyMode ? { ...cfg, mode: k } : keyPatch({ ...cfg, mode: k }, { keyMode: q }, q); };

export function ScaleGroups({ cfg, update }) {
  const { scope, mode, keyMode } = cfg;
  const pick = (v) => {
    if (MINOR_SCALES.includes(v)) update(modePatch({ ...cfg, scope: "scale" }, v));
    else if (v === "scale") update({ scope: "scale", mode: scope === "scale" && !MINOR_SCALES.includes(mode) ? mode : keyMode === "major" ? "ionian" : "aeolian" });
    else update({ scope: v });
  };
  return (
    <React.Fragment>
      <KeyGroup cfg={cfg} update={update} />
      <Grp cap="Scale"><Sel label="Scale" value={scaleValue(cfg)} options={SCALES} onChange={pick} /></Grp>
      {/* Mode: only for the seven-note scale of the modes (mock-up call 5). */}
      {scope === "scale" && !MINOR_SCALES.includes(mode) && <Grp cap="Mode"><Sel label="Mode" value={mode} options={MODES} onChange={(v) => update(modePatch(cfg, v))} /></Grp>}
    </React.Fragment>
  );
}

export function ScalePage({ tuning, cfg, update, globals, at, setAt }) {
  const boardRef = React.useRef(null);
  // A card tap shows its window on the neck; when the neck is off screen it comes into view.
  const toBoard = () => {
    const el = boardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <Board tuning={tuning} cfg={cfg} update={update} globals={globals} lead={<ScaleGroups cfg={cfg} update={update} />} boardRef={boardRef}>
      <ScaleCards tuning={tuning} cfg={cfg} update={update} at={at} setAt={setAt} labelMode={globals.labelMode} setIsolate={globals.setIsolate} toBoard={toBoard} />
    </Board>
  );
}
