// Fretboard Trainer · the Scale tab (Build A and B, E9 model): Key, Scale and Mode in the bar, the neck, the panel under it
// (what is on the neck, ▲ ▼, ‹ ›) and the list of paths and positions (Build B; it replaced the scale cards).
import { MODES, OTHER_SCALES, MODE_Q } from "../../core/scales.js";
import { Grp, Sel } from "../../core/ui.jsx";
import { Board, KeyGroup } from "./neck.jsx";
import { usePathRows, stepsOf, PathPanel, PathList } from "./pathlist.jsx";
import { keyPatch } from "./state.js";

// Scale (mock-up call 5): the layers and the other scales in one menu. "Scale" is the seven modes, chosen under Mode. The
// other scales: the two minor scales, then Build D's six (core OTHER_SCALES), each with its own state as the minor scales have.
const SCALES = [["scale", "Scale"], ["pentatonic", "Pentatonic"], ["blues", "Blues"], ["blended", "Major and minor"], ...OTHER_SCALES];
const OTHER_KEYS = OTHER_SCALES.map(([k]) => k);
export const scaleValue = (cfg) => (cfg.scope === "scale" && OTHER_KEYS.includes(cfg.mode) ? cfg.mode : cfg.scope);

// A mode or minor scale with the other 3rd switches Major / Minor (Round 4b).
const modePatch = (cfg, k) => { const q = MODE_Q(k); return q === cfg.keyMode ? { ...cfg, mode: k } : keyPatch({ ...cfg, mode: k }, { keyMode: q }, q); };

export function ScaleGroups({ cfg, update }) {
  const { scope, mode, keyMode } = cfg;
  const pick = (v) => {
    if (OTHER_KEYS.includes(v)) update(modePatch({ ...cfg, scope: "scale" }, v));
    else if (v === "scale") update({ scope: "scale", mode: scope === "scale" && !OTHER_KEYS.includes(mode) ? mode : keyMode === "major" ? "ionian" : "aeolian" });
    else update({ scope: v });
  };
  return (
    <React.Fragment>
      <KeyGroup cfg={cfg} update={update} />
      <Grp cap="Scale"><Sel label="Scale" value={scaleValue(cfg)} options={SCALES} onChange={pick} /></Grp>
      {/* Mode: only for the seven-note scale of the modes (mock-up call 5). */}
      {scope === "scale" && !OTHER_KEYS.includes(mode) && <Grp cap="Mode"><Sel label="Mode" value={mode} options={MODES} onChange={(v) => update(modePatch(cfg, v))} /></Grp>}
    </React.Fragment>
  );
}

export function ScalePage({ tuning, cfg, update, globals, at, setAt }) {
  const boardRef = React.useRef(null);
  // A row tap shows its path on the neck; when the neck is off screen it comes into view.
  const toBoard = () => {
    const el = boardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const data = usePathRows(tuning, cfg, at, globals.range);
  const { chosen, current } = data;
  // A path in the link that this scale and key do not have (a hand-edited link), or one outside the fret range (Build C), is
  // dropped, as Focus drops a degree.
  React.useEffect(() => { if (at.pid && !chosen) setAt((a) => ({ ...a, pid: null, pstep: 0 })); });
  // A row: a window sets Position as the bar did (TC 25 Nov), All the five together; a path takes Position's place.
  // Choosing a Position clears the path (main.jsx).
  const pick = (r, scroll = false) => {
    if (r.all) update({ pos: "all" });
    else if (r.win) { update({ pos: r.win.num }); setAt((a) => ({ ...a, pid: null, pstep: 0 })); }
    else { update({ pos: null }); setAt((a) => ({ ...a, pid: r.id, pstep: 0 })); }
    if (scroll) toBoard();
  };
  const whole = () => { update({ pos: null }); setAt((a) => ({ ...a, pid: null, pstep: 0 })); };
  const steps = stepsOf(current);
  const stepCell = steps.length ? steps[Math.min(at.pstep, steps.length - 1)] : null;
  const path = chosen ? { id: chosen.id, set: new Set(chosen.cells.map((c) => c.s * 100 + c.f)), wins: chosen.wins.map((w) => w.num), lo: chosen.lo, hi: chosen.hi,
    chip: `${chosen.name}${chosen.nps ? " " + chosen.nps : ""} · ${chosen.fretsTxt}` } : null;
  return (
    <Board tuning={tuning} cfg={cfg} update={update} globals={globals} lead={<ScaleGroups cfg={cfg} update={update} />} boardRef={boardRef}
      posInBar={false} path={path} stepCell={stepCell} onClearPath={whole}
      foot={<PathPanel tuning={tuning} data={data} at={at} setAt={setAt} onPick={(r) => pick(r)} onWhole={whole} labelMode={globals.labelMode} />}>
      <PathList tuning={tuning} cfg={cfg} data={data} at={at} setAt={setAt} onPick={(r) => pick(r, true)} labelMode={globals.labelMode} range={globals.range} />
    </Board>
  );
}
