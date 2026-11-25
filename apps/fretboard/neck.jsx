// Fretboard Trainer · the board: gap fill, nut substitutes, the neck with its summary row, and the bar's filter groups. The
// Scale tab draws it with the scale layers, the Chord tab's All positions with the chord (Build A).
import { useMemo, useEffect } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { toggle } from "../../core/util.js";
import { NOTES_SHARP, NOTES_FLAT, LETTERS } from "../../core/notes.js";
import { DEG_LABEL, DEG_OVERRIDE, MODE_NAME, KEY_DEG, MODES, OTHER_SCALES, MODE_IV, MODE_Q, scopeIntervals } from "../../core/scales.js";
import { accs, spellAt, keySpelling, autoLetter, neckLetter } from "../../core/spelling.js";
import { QUAL_NAME } from "../../core/chords.js";
import { Seg, Track, Btn, Bar, Grp, Sel, Labels, Chip, ClearAll } from "../../core/ui.jsx";
import { MARKERS, colPx, inlayAt } from "./guitar.js";
import { NEUTRAL_CT, NEUTRAL_OTHER, POS_COLOR, POS_TINT, HATCH, POS_MAJOR, POS_MINOR, CAGED_ANCHOR } from "./caged.js";
import { TILE, ROOT } from "../../core/marker.js";
import { keyPatch } from "./state.js";

// The Key menu's 12 roots, each spelled as the neck would spell that root in the layer shown, so G♭ in Lydian (Round 9).
export const keyOptions = (cfg) => { const li = neckLetter(cfg); return NOTES_SHARP.map((n, i) => [i, accs(spellAt(cfg.keyRoot === i ? li : autoLetter(i, cfg), i))]); };
// Key and Major / Minor, both gold (UX-09, IA-review decision 3; the key as a menu since Build A). Major / Minor goes back to
// Ionian or Aeolian unless the chosen mode already has that 3rd (Round 4b).
// view: the state the names are spelled for (the Chord tab spells for the chord layer); names: other root names (In key uses
// the standard key names, as v0.41's Chords page did).
export function KeyGroup({ cfg, update, view = cfg, names = null }) {
  const { keyRoot, keyMode, mode } = cfg;
  return (
    <Grp cap="Key">
      <Sel label="Key" gold value={keyRoot} options={names || keyOptions(view)} onChange={(v) => update(keyPatch(cfg, { keyRoot: +v }))} />
      <Track label="Major or minor" cols={2}>{[["major","Major"],["minor","Minor"]].map(([t,l]) => <Seg key={t} tone="gold" active={keyMode === t} onClick={() => update(keyPatch(cfg, { keyMode: t, mode: keyMode === t && MODE_Q(mode) === t ? mode : t === "major" ? "ionian" : "aeolian" }))}>{l}</Seg>)}</Track>
    </Grp>
  );
}

// The layers that take the gap fill in a single position.
export const FILL_LAYERS = ["scale", "arpeggio", "blues", "blended"];
// Window gap fill (SH-21, 22, 25 to 28, 30). In the lowest complete copy of window p, the layer's pitches run low to high;
// each pitch missing between the lowest and highest takes the nearest on-board cell outside the window, a tie going above.
// Returns keys s * 12 + (fret mod 12), so the fill repeats with the window 12 frets up or down, as inPos does.
const GAP_CACHE = new Map();
export function gapCells(tuning, root, set, p) {
  const ivs = [...set].sort((a, b) => a - b);
  const id = `${tuning.id}|${root}|${ivs.join(",")}|${p.off}|${p.w}`;
  if (GAP_CACHE.has(id)) return GAP_CACHE.get(id);
  const base = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
  const top = base + p.w;
  const inSet = (m) => set.has((((m - root) % 12) + 12) % 12);
  const have = new Set();
  for (let s = 0; s < tuning.strings; s++) for (let f = base; f <= top; f++) if (inSet(tuning.openAbs[s] + f)) have.add(tuning.openAbs[s] + f);
  const out = new Set(), cut = new Set();
  out.cut = cut;
  if (have.size) {
    const lo = Math.min(...have), hi = Math.max(...have);
    for (let m = lo + 1; m < hi; m++) {
      if (!inSet(m) || have.has(m)) continue;
      let best = null;
      for (let s = 0; s < tuning.strings; s++) {
        const f = m - tuning.openAbs[s];
        if (f < 0 || f > tuning.frets || (f >= base && f <= top)) continue;
        const d = f < base ? base - f : f - top;
        if (!best || d < best.d || (d === best.d && f > top)) best = { s, f, d };
      }
      if (!best) continue;
      out.add(best.s * 12 + (best.f % 12));
      // A full copy 12 or 24 frets up whose fill would land past the last fret takes the nearest on-board cell outside it
      // instead, which is below it (Round 4b, open item 3 = b). Kept as exact cells (s * 100 + fret) so no other copy changes.
      for (let k = 12; top + k <= tuning.frets; k += 12) {
        if (best.f + k <= tuning.frets) continue;
        let alt = null;
        for (let s = 0; s < tuning.strings; s++) {
          const f = m + k - tuning.openAbs[s];
          if (f < 0 || f > tuning.frets || (f >= base + k && f <= top + k)) continue;
          const d = f < base + k ? base + k - f : f - top - k;
          if (!alt || d < alt.d || (d === alt.d && f > top + k)) alt = { s, f, d };
        }
        if (alt) cut.add(alt.s * 100 + alt.f);
      }
    }
  }
  GAP_CACHE.set(id, out);
  return out;
}

// Nut substitutes. A cell of the window's lower copy (12 frets down, gap fill included) that falls below the nut is played at
// the same pitch on the next lower string, where that cell is not already in the window; the low E string has none.
// Returns keys s * 100 + fret for the substitute cells.
function nutSubs(tuning, root, set, p, gaps) {
  const base = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
  const lo = base - 12, out = new Set();
  if (lo + p.w < 0) return out;
  const inWinAt = (s, f) => ((((f - base) % 12) + 12) % 12) <= p.w || (gaps !== null && gaps.has(s * 12 + (((f % 12) + 12) % 12)));
  for (let s = 0; s < tuning.strings - 1; s++) for (let f = lo - 1; f < 0; f++) {
    if (!set.has((((tuning.openAbs[s] + f - root) % 12) + 12) % 12) || !inWinAt(s, f)) continue;
    const g = f + tuning.openAbs[s] - tuning.openAbs[s + 1];
    if (g >= 0 && !inWinAt(s + 1, g)) out.add((s + 1) * 100 + g);
  }
  return out;
}

// lead: the tab's own bar groups (Key, Scale, Mode; or Chord's Show and chord). The board adds Position (Chord tab; the Scale
// tab lists its windows under the neck since Build B: posInBar false) and More, the summary row (filter chips, Clear all,
// Labels) and the neck. Build B (Scale tab): path, a chosen path on the neck ({ set of s * 100 + fret, wins, lo, hi, chip });
// stepCell, the note ‹ › stands on (ringed); onClearPath, its chip's ✕; foot, the panel under the neck, inside the board's
// block so it stays with the neck on a phone.
export function Board({ tuning, cfg, update, globals, lead = null, boardRef = null, children = null, posInBar = true, path = null, stepCell = null, onClearPath = null, foot = null }) {
  const { scope, arp, pos, focus, keyRoot, keyMode, arpMode, diaLabel, strGroup, mode } = cfg;
  const { labelMode, isolate, ghost, dotColour, more, setLabelMode, setIsolate, setGhost, setDotColour, setMore } = globals;
  const caged = dotColour === "caged";
  // Only the Arpeggio layer reads the chord root and quality; every other layer uses the key (UX-10).
  const root = scope === "arpeggio" ? cfg.root : keyRoot;
  const tonality = scope === "arpeggio" ? cfg.tonality : keyMode;
  const scopeSet = useMemo(() => new Set(scopeIntervals(tonality, scope, arp, mode)), [tonality, scope, arp, mode]);
  // Chord tones: every tone of the chord; in a scale layer, its 1, 3, 5 and 7 (TH-04).
  const ctSet = useMemo(() => {
    if (scope === "arpeggio") return scopeSet;
    const par = scope === "scale" ? scopeIntervals(tonality, scope, arp, mode) : MODE_IV[tonality === "major" ? "ionian" : "aeolian"];
    return new Set([par[0], par[2], par[4], par[6]].filter((iv) => scopeSet.has(iv)));
  }, [scope, scopeSet, tonality, arp, mode]);
  const posList = tonality === "major" ? POS_MAJOR : POS_MINOR;
  const interlock = pos === "all";
  const activePos = typeof pos === "number" ? posList.find((p) => p.num === pos) : null;
  // Gap fill applies in a single position only: Scale and Chord (v0.23), Blues and Major and minor (Build B, TC 25 Nov).
  // Pentatonic has no gaps and stays unfilled (16 Nov); All is unchanged.
  const gaps = useMemo(() => (activePos && FILL_LAYERS.includes(scope) ? gapCells(tuning, root, scopeSet, activePos) : null), [tuning, activePos, scope, root, scopeSet]);
  // Nut substitutes apply to every layer in a single position; All is unchanged.
  const subs = useMemo(() => (activePos ? nutSubs(tuning, root, scopeSet, activePos, gaps) : null), [tuning, activePos, root, scopeSet, gaps]);
  // Focus keeps only degrees that can be lit in the current position, strings and Isolate; one that leaves is dropped (UX-13). Interlock ignores focus (UX-14).
  const litSet = new Set();
  for (let s = 0; s < tuning.strings; s++) for (let f = 0; f <= tuning.frets; f++) {
    const iv = (((tuning.open[s] + f - root) % 12) + 12) % 12;
    if (scopeSet.has(iv) && (interlock || !isolate || ctSet.has(iv)) && (strGroup === null || (s >= strGroup && s <= strGroup + 2)) && (!(activePos || path) || inWin(s, f))) litSet.add(iv);
  }
  const activeFocus = interlock ? [] : focus.filter((iv) => litSet.has(iv));
  useEffect(() => { if (!interlock && activeFocus.length !== focus.length) update({ focus: activeFocus }); });
  const focusSet = new Set(activeFocus);
  const anyFocus = activeFocus.length > 0;
  // Degree names follow the scale or chord formula (TH-05); note names follow the key signature (TH-01).
  const degKey = scope === "scale" ? mode : scope === "arpeggio" ? arp : scope;
  const fdeg = (iv) => (DEG_OVERRIDE[degKey] && DEG_OVERRIDE[degKey][iv]) || DEG_LABEL[iv];
  const keyLi = neckLetter(cfg);
  const keySp = useMemo(() => keySpelling(keyRoot, keyMode, keyLi), [keyRoot, keyMode, keyLi]);
  const rootLetter = keySp[root] ? keySp[root].letter : LETTERS.indexOf(NOTES_FLAT[root][0]);
  const spellName = (pc) => {
    const iv = (((pc - root) % 12) + 12) % 12;
    if (!scopeSet.has(iv) && keySp[pc]) return keySp[pc].name;
    const d = /(\d)$/.exec(scopeSet.has(iv) ? fdeg(iv) : DEG_LABEL[iv]);
    return spellAt(rootLetter + (d ? +d[1] : 1) - 1, pc);
  };
  const noteName = (pc) => accs(spellName(pc));

  function inPos(f, p) {
    const base = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
    return ((((f - base) % 12) + 12) % 12) <= p.w;
  }
  // A gap-fill cell and a nut substitute count as inside the active position.
  // A chosen path (Build B) takes the window's place: its own cells count as inside.
  function inWin(s, f) { if (path) return path.set.has(s * 100 + f); return inPos(f, activePos) || (gaps !== null && (gaps.has(s * 12 + (f % 12)) || gaps.cut.has(s * 100 + f))) || (subs !== null && subs.has(s * 100 + f)); }
  const phase = (f, p) => { const b = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12; return ((((f - b) % 12) + 12) % 12); };

  // One size: the neck fits the width when full-size dots fit, and scrolls below that (RS-01); the View control is gone.
  const cellH = 46;
  const dotBig = 30;
  const dotBase = 24;
  const fontPx = 11; // nothing under 11 px (BR-05)
  const COLS = `30px ${colPx(tuning.frets).map((n) => `minmax(${n}px, ${n}fr)`).join(" ")}`;

  // Position ruler (DS-03): each window copy on the neck as a labelled span. In All, spans take two lanes so that
  // overlapping windows never share one; a single position uses the first lane.
  const ruler = useMemo(() => {
    const spans = [];
    posList.forEach((p) => {
      const b = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
      for (let c = b - 12; c <= tuning.frets; c += 12) {
        const a = Math.max(0, c), z = Math.min(tuning.frets, c + p.w);
        if (z >= a) spans.push({ p, a, z, clipped: a !== c || z !== c + p.w });
      }
    });
    spans.sort((x, y) => x.a - y.a || x.z - y.z);
    const ends = [];
    spans.forEach((sp) => {
      let l = ends.findIndex((e) => e < sp.a);
      if (l < 0) { l = ends.length; ends.push(-1); }
      ends[l] = sp.z; sp.lane = l;
    });
    return { spans, lanes: Math.max(2, ends.length) };
  }, [tuning, posList, root]);

  // Scroll to the chosen position when the neck scrolls (RS-03 part): the window's main copy, one fret either side, centred.
  const scrollRef = React.useRef(null);
  // A chosen path scrolls the same way, to its own frets (Build B).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !(activePos || path) || el.scrollWidth <= el.clientWidth) return;
    const b = path ? path.lo : (((root - CAGED_ANCHOR + activePos.off) % 12) + 12) % 12, w = path ? path.hi - path.lo : activePos.w;
    const lo = el.querySelector(`[data-fret="${Math.max(0, b - 1)}"]`), hi = el.querySelector(`[data-fret="${Math.min(tuning.frets, b + w + 1)}"]`);
    if (!lo || !hi) return;
    const box = el.getBoundingClientRect(), l = lo.getBoundingClientRect().left - box.left + el.scrollLeft, r = hi.getBoundingClientRect().right - box.left + el.scrollLeft;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A path wider than the view starts at its first fret, so its first notes are not cut off (Build B).
    const left = path && r - l > el.clientWidth ? l : (l + r) / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
  }, [tuning, pos, root, tonality, path && path.id]);
  const keyRel = scope === "arpeggio" && arpMode === "diatonic" && diaLabel === "key";
  const degLabel = (pc, iv) => {
    if (keyRel) {
      const ki = (((pc - keyRoot) % 12) + 12) % 12;
      return KEY_DEG[keyMode][ki] || (ki === 0 ? "1" : DEG_LABEL[ki]);
    }
    return fdeg(iv);
  };
  const labelOf = (pc, iv) => {
    if (labelMode === "name") return noteName(pc, root);
    if (labelMode !== "degree") return "";
    return degLabel(pc, iv);
  };

  const renderRow = (s) => {
    const cells = [];
    for (let f = 0; f <= tuning.frets; f++) {
      const pc = (tuning.open[s] + f) % 12;
      const iv = ((pc - root) % 12 + 12) % 12;
      const inScope = scopeSet.has(iv);
      const isRoot = iv === 0;
      const isCT = ctSet.has(iv);
      let dim = false;
      if (strGroup !== null && (s < strGroup || s > strGroup + 2)) dim = true;
      if (!interlock) {
        if ((activePos || path) && !inWin(s, f)) dim = true;
        if (anyFocus && !focusSet.has(iv)) dim = true;
        if (isolate && !ctSet.has(iv)) dim = true;
      }
      // Fill: the position colour inside a single position. With no position and in All, Dot colour decides (Round 6b):
      // CAGED gives each note its window's colour, half and half on a diagonal where two windows share it, the lower window
      // top left (as v0.25); Neutral gives the value step (DS-05). The root (Build A) is the same tile with an ink frame inside its edge.
      let posFill = activePos && inWin(s, f) ? POS_COLOR[activePos.letter] : null;
      if (!activePos && caged) {
        const hits = posList.filter((p) => inPos(f, p)).sort((a, b) => phase(f, b) - phase(f, a)).map((p) => POS_COLOR[p.letter]);
        posFill = hits.length > 1 ? `linear-gradient(135deg, ${hits[0]} 0 50%, ${hits[1]} 50% 100%)` : hits[0] || null;
      }
      const fill = posFill || (isCT ? NEUTRAL_CT : NEUTRAL_OTHER);
      const sz = isRoot || isCT ? dotBig : dotBase;
      // A nut substitute is hatched in its position colour; on a root the hatch runs through the centre and the ring.
      const isSub = !interlock && subs !== null && subs.has(s * 100 + f);
      const hatch = (c) => `repeating-linear-gradient(135deg, ${c} 0 3px, ${HATCH[activePos.letter]} 3px 6px)`;
      // Filtered-out notes are monochrome open squares, not faded tiles (DS-01): edge outline, muted label. The root keeps a
      // heavier outline; a nut substitute keeps a dashed one.
      const ring = (w) => `${w}px ${isSub ? "dashed" : "solid"} ${THEME.edge}`;
      const face = dim
        ? { background: "transparent", border: ring(isRoot ? 3 : 1.5), color: THEME.muted }
        : { background: isSub ? hatch(fill) : fill, color: THEME.ink };
      // Build B: notes off the chosen path are open squares with no label (mock-up call 3); the step ‹ › stands on has an
      // outer ring in the text colour, a gap of the board's colour between (call 4). The tile keeps its own inset edge or frame.
      const offPath = path !== null && !path.set.has(s * 100 + f);
      const stepOn = stepCell !== null && stepCell.s === s && stepCell.f === f;
      const stepRing = `0 0 0 2px ${THEME.panel2}, 0 0 0 4px ${THEME.text}`;
      const ringStyle = stepOn ? { boxShadow: dim ? stepRing : `${isRoot ? `inset 0 0 0 2px ${THEME.ink}` : `inset 0 0 0 1px ${THEME.dotEdge}`}, ${stepRing}` } : null;
      const lab = offPath ? "" : labelOf(pc, iv);
      // All with Neutral dots: a faint tint of each window behind its frets, split where two windows meet (decision 6 = b).
      // With CAGED dots the dots carry the colour, so there is no tint (Round 6b). The ruler names the windows.
      let tint;
      if (interlock && !caged) {
        const hits = posList.filter((p) => inPos(f, p)).sort((a, b) => phase(f, b) - phase(f, a)).map((p) => POS_TINT[p.letter]);
        if (hits.length) tint = hits.length > 1 ? `linear-gradient(90deg, ${hits[0]} 0 50%, ${hits[1]} 50% 100%)` : `linear-gradient(${hits[0]}, ${hits[0]})`;
      }
      const cellBg = [tint, f === 0 && THEME.track].filter(Boolean).join(", ") || undefined;
      // The whole fret cell is the dot's hit area (A11y-W2); dots leave the tab order, the Focus chips do the same job (A11y-W5).
      const tappable = inScope && !interlock;
      const title = `${noteName(pc)} · ${fdeg(iv)}`;
      cells.push(
        <div key={f} data-fret={s === 0 ? f : undefined} onClick={tappable ? () => update({ focus: toggle(activeFocus, iv) }) : undefined} className="relative flex items-center justify-center" style={{ height: cellH, borderRight: f === 0 ? `5px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, background: cellBg, cursor: tappable ? "pointer" : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: 11, height: 11 }} />}
          <div className="absolute left-0 right-0" style={{ top: "50%", transform: "translateY(-50%)", height: tuning.gauges[s], background: THEME.edge }} />
          {inScope && (isRoot && !dim ? (
            <button tabIndex={-1} disabled={interlock} data-root="1" data-step={stepOn ? "1" : undefined} className={"fdot " + ROOT + " relative flex items-center justify-center transition-all"} style={{ width: sz, height: sz, background: face.background, color: face.color, fontSize: fontPx, fontWeight: 800, zIndex: 5, cursor: interlock ? "default" : "pointer", ...ringStyle }} title={title}>{lab}</button>
          ) : (
            <button tabIndex={-1} disabled={interlock} data-step={stepOn ? "1" : undefined} className={(dim ? "" : "fdot ") + TILE + " relative flex items-center justify-center transition-all"} style={{ width: sz, height: sz, fontSize: fontPx, fontWeight: isRoot || isCT ? 800 : 500, ...face, zIndex: stepOn ? 6 : isRoot ? 5 : isCT ? 3 : 2, cursor: interlock ? "default" : "pointer", ...ringStyle }} title={title}>{lab}</button>
          ))}
          {/* Chromatic notes are bare labels with no circle, so a circle always means "in the set" (DS-06). */}
          {!inScope && ghost && (
            <div className="absolute flex items-center justify-center" style={{ color: dim ? THEME.edge : THEME.muted, fontSize: 11, fontWeight: 600, zIndex: 1 }} title={noteName(pc, root)}>{labelOf(pc, iv) || <span style={{ width: 5, height: 5, borderRadius: 3, background: dim ? THEME.edge : THEME.muted }} />}</div>
          )}
        </div>
      );
    }
    return (
      <div key={s} className="contents">
        <div className="flex items-center justify-center text-xs font-semibold text-muted" style={{ height: cellH }}>{tuning.labels[s]}</div>
        {cells}
      </div>
    );
  };

  const degrees = [...scopeSet].sort((a,b) => a-b);
  // One plain summary line (UX-07): "G7", "B diminished", "A minor pentatonic".
  const rootName = noteName(root, root);
  const summary = scope === "arpeggio"
    ? (arp === "triad" ? `${rootName} ${tonality}` : arp === "dim" ? `${rootName} diminished` : arp === "aug" ? `${rootName} augmented` : rootName + QUAL_NAME[arp])
    : scope === "scale" ? `${rootName} ${MODE_NAME[mode]}`
    : scope === "blended" ? `${rootName} major and minor pentatonic`
    : `${rootName} ${tonality} ${scope}`;

  // Active filters as chips, each with ✕, and Clear all beside them while any is on (UX-12; Build A, streamline item 3).
  // Focus shows here too (UX-17).
  const chips = [
    path && [path.chip, onClearPath],
    interlock ? ["All positions", () => update({ pos: null })] : activePos && [`Position ${activePos.num} ${activePos.letter}`, () => update({ pos: null })],
    strGroup !== null && [`Strings ${["1–3","2–4","3–5","4–6"][strGroup]}`, () => update({ strGroup: null })],
    isolate && !interlock && ["Chord tones", () => setIsolate(false)],
    anyFocus && [`Focus ${activeFocus.slice().sort((a,b) => a-b).map((iv) => degLabel((root + iv) % 12, iv)).join(" ")}`, () => update({ focus: [] })],
  ].filter(Boolean);
  const clearAll = () => { update({ pos: null, strGroup: null, focus: [] }); setIsolate(false); if (path && onClearPath) onClearPath(); };
  const drop = <span aria-hidden="true" className="text-muted" style={{ marginLeft: 6, display: "inline-block", transform: more ? "rotate(180deg)" : "none" }}>▾</span>;

  return (
    <div>
      {/* The bar (Build A, E9 model): the tab's groups, then Position (Chord tab; the Scale tab lists the windows, Build B) and More. */}
      <Bar>
        {lead}
        {posInBar && <Grp cap="Position">
          {/* Seven equal cells: the shape letter as the label, its number small, the colour as the underline (mock-up C).
              The number is 11 px, the floor (BR-05); the accessible name stays "1 C". */}
          <Track label="Position" cols={7}>
            <Seg active={pos === null} onClick={() => update({ pos: null })}>Off</Seg>
            {posList.map((p) => <Seg key={p.num} active={pos === p.num} onClick={() => update({ pos: p.num })} pos={POS_COLOR[p.letter]} aria-label={`${p.num} ${p.letter}`}><span aria-hidden="true" style={{ fontSize: 11, fontWeight: 500, marginRight: 3 }}>{p.num}</span>{p.letter}</Seg>)}
            <Seg active={interlock} onClick={() => update({ pos: "all" })}>All</Seg>
          </Track>
        </Grp>}
        <Grp cap="More">
          <Btn onClick={() => setMore((m) => !m)} aria-expanded={more} aria-controls="bar-more" aria-label="More: strings, notes, focus, other notes, dot colour">Strings · Notes · Focus{drop}</Btn>
        </Grp>
      </Bar>
      {more && (
        <div id="bar-more" className="bmore">
          <Bar label="More">
            <Grp cap="Strings">
              <Track label="Strings" cols={5}>
                <Seg active={strGroup === null} onClick={() => update({ strGroup: null })}>All</Seg>
                {[[0,"1–3"],[1,"2–4"],[2,"3–5"],[3,"4–6"]].map(([g,l]) => <Seg key={g} active={strGroup === g} onClick={() => update({ strGroup: g })}>{l}</Seg>)}
              </Track>
            </Grp>
            {/* Was the Isolate chord tones toggle: same state, unavailable in All (IA-01). */}
            <Grp cap="Notes">
              <Track label="Notes" cols={2}>
                <Seg active={!isolate || interlock} disabled={interlock} onClick={() => setIsolate(false)}>All</Seg>
                <Seg active={isolate && !interlock} disabled={interlock} onClick={() => setIsolate(true)}>Chord tones</Seg>
              </Track>
            </Grp>
            {/* Focus chips: degree and note only, chord tones bold (DS-08). In All the chips are unavailable, like Notes. */}
            <Grp cap="Focus">
              {degrees.map((iv) => {
                const focused = focusSet.has(iv);
                const ct = ctSet.has(iv);
                const off = interlock || !litSet.has(iv);
                const quiet = anyFocus && !focused;
                return (
                  <button key={iv} disabled={off} aria-disabled={off} aria-pressed={focused} onClick={() => update({ focus: toggle(activeFocus, iv) })} className="chip flex items-center gap-2 px-2 rounded-lg text-xs" style={{ border: `1px solid ${focused ? "transparent" : THEME.edge}`, background: focused ? THEME.ctlHover : quiet ? "transparent" : THEME.ctl, boxShadow: focused ? `0 0 0 1.5px ${THEME.text}` : "none", opacity: off ? 0.5 : 1, cursor: off ? "default" : "pointer", fontWeight: ct ? 800 : 500 }}>
                    <span className="text-body">{degLabel((root + iv) % 12, iv)}</span>
                    <span className="text-muted">{noteName((root + iv) % 12, root)}</span>
                  </button>
                );
              })}
            </Grp>
            <Grp cap="Other notes">
              <Track label="Other notes" cols={2}>
                <Seg active={!ghost} onClick={() => setGhost(false)}>Hidden</Seg>
                <Seg active={ghost} onClick={() => setGhost(true)}>Shown</Seg>
              </Track>
            </Grp>
            {/* With no position and in All: CAGED colours each note by its window, half and half where two share it (Round 6b). */}
            <Grp cap="Dot colour">
              <Track label="Dot colour" cols={2}>{[["caged","CAGED"],["neutral","Neutral"]].map(([k,l]) => <Seg key={k} active={dotColour === k} onClick={() => setDotColour(k)}>{l}</Seg>)}</Track>
            </Grp>
          </Bar>
        </div>
      )}

      {/* Summary row and board; sticky on an upright phone (RS-03). Labels sits at the right end of the summary row. */}
      <div ref={boardRef} className="boardwrap">
        <div className="sumrow">
          <span data-summary className="text-sm font-semibold text-body">{summary}</span>
          {chips.map(([t, clear]) => <Chip key={t} text={t} onClear={clear} />)}
          {chips.length > 0 && <ClearAll onClick={clearAll} />}
          <Labels value={labelMode} set={setLabelMode} />
        </div>
        <div ref={scrollRef} className="overflow-x-auto pb-2 rounded-xl" style={{ background: THEME.panel2 }}>
          <div className="grid p-3" style={{ gridTemplateColumns: COLS, width: "100%", minWidth: "min-content" }}>
            {Array.from({ length: tuning.strings }, (_, s) => renderRow(s))}
            <div />
            {/* Fret numbers: muted; marker frets bold in text. The marker-dot row is gone (DS-07). */}
            {Array.from({ length: tuning.frets + 1 }, (_, f) => (
              <div key={"n" + f} className="flex items-center justify-center text-xs" style={{ height: 24, color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</div>
            ))}
            {/* Position ruler (DS-03, A11y-W3): names each window span in text, always in two or more lanes so spans never
                overlap. Low-key grey where a position is not chosen; colour for the chosen position and in All (Round 6b). */}
            {Array.from({ length: ruler.lanes }, (_, l) => <div key={"rl" + l} style={{ gridRow: tuning.strings + 2 + l, gridColumn: 1, height: 22 }} />)}
            {ruler.spans.map((sp) => {
              const on = interlock || (activePos !== null && sp.p.num === activePos.num) || (path !== null && path.wins.includes(sp.p.num));
              const c = on ? POS_COLOR[sp.p.letter] : THEME.line, side = on ? 2 : 1;
              return (
                <div key={`r${sp.p.num}-${sp.a}`} data-ruler={`${sp.p.num} ${sp.p.letter}`} data-on={on ? "1" : undefined} className={"flex items-end justify-center text-xs " + (on ? "font-semibold text-body" : "text-muted")}
                  style={{ gridRow: tuning.strings + 2 + sp.lane, gridColumn: `${sp.a + 2} / ${sp.z + 3}`, height: 22, margin: "0 2px", paddingBottom: 3, whiteSpace: "nowrap", overflow: "hidden",
                    borderBottom: `${on ? 3 : 1}px solid ${c}`, borderLeft: sp.clipped && sp.a === 0 ? "none" : `${side}px solid ${c}`, borderRight: sp.clipped && sp.z === tuning.frets ? "none" : `${side}px solid ${c}` }}>
                  {sp.p.num} {sp.p.letter}
                </div>
              );
            })}
          </div>
        </div>
        {foot}
      </div>
      {/* The list under the neck (the scale cards on the Scale tab); inside the board's block so the sticky board stays over it. */}
      {children}
    </div>
  );
}
