// Fretboard Trainer · Chord → In key (v0.41's Chords page, moved unchanged in Build A): triad and seventh ladders on string sets.
import { useMemo, useEffect } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { KEY_NAME } from "../../core/notes.js";
import { DEG_LABEL, DEG_OVERRIDE, KEY_DEG, MODE_IV, KEY_DEG_HM } from "../../core/scales.js";
import { accs, keySpelling, uniAcc, hmSpelling } from "../../core/spelling.js";
import { DIATONIC, INV_NAME, INV_NAME7, CH_Q, DIATONIC7, DROP2, DROP3 } from "../../core/chords.js";
import { Seg, Track, Btn, Bar, Grp, Labels } from "../../core/ui.jsx";
import { MARKERS, colPx, SET_NAME, inlayAt } from "./guitar.js";
import { POS_COLOR, formFill, formName } from "./caged.js";
import { chordForms } from "./chordshapes.js";
import { TILE, ROOT, outlineMask } from "../../core/marker.js";

const SET_NAME7 = ["1–4", "2–5", "3–6"];
const SET_NAME3 = ["5 3 2 1", "6 4 3 2"];
// The strings of a seventh set, low to high, by voicing (2 or 3) and set index g (top string index).
const SET_STRS = { 2: (g) => [g + 3, g + 2, g + 1, g], 3: (g) => [g + 4, g + 2, g + 1, g] };
// The ladder on string set g (top string index: 0 = strings 1–3). Chord k's bass, on the set's lowest string, is the chord
// tone the inversion puts there; each higher string takes the next chord tone above (closed). I sits at its lowest place
// on the neck and each chord climbs from the one below; a chord that would pass fret 21 drops an octave (Round 5).
// Frets per shape are listed low string to high, as in the strip.
function triadLadder(tuning, keyRoot, keyMode, g, inv) {
  const sc = MODE_IV[keyMode === "major" ? "ionian" : "aeolian"];
  const strs = [g + 2, g + 1, g];
  let prev = null;
  return DIATONIC[keyMode].map(([rn, off, q], k) => {
    const pcs = [0, 2, 4].map((j) => (keyRoot + sc[(k + j) % 7]) % 12);
    const order = [...pcs.slice(inv), ...pcs.slice(0, inv)];
    const up = (p, pc) => { let m = p; while (((m % 12) + 12) % 12 !== pc) m++; return m; };
    const build = (b) => { const ps = [b]; order.slice(1).forEach((pc) => ps.push(up(ps[ps.length - 1] + 1, pc))); return ps; };
    let bass;
    if (prev === null) { bass = up(tuning.openAbs[strs[0]] - 12, order[0]); while (build(bass).some((m, i) => m - tuning.openAbs[strs[i]] < 0)) bass += 12; }
    else bass = up(prev + 1, order[0]);
    prev = bass;
    let frets = build(bass).map((m, i) => m - tuning.openAbs[strs[i]]);
    if (Math.max(...frets) > tuning.frets) frets = frets.map((f) => f - 12);
    return { rn, root: pcs[0], q, cells: frets.map((f, i) => ({ s: strs[i], f, pc: (tuning.open[strs[i]] + f) % 12 })), frets };
  });
}
// The seventh ladder on string set g (top string index: 0 = strings 1–4): as triadLadder, with the drop-2 order of the
// inversion. Each tone is the next one above the string below, which gives the drop-2 spacing (bass to top under 2 octaves).
// Drop-3 (Round 10) uses its own order and strings the same way; harm takes harmonic minor's sevenths (minor keys only).
function seventhLadder(tuning, keyRoot, keyMode, g, inv, drop = 2, harm = false) {
  const sc = MODE_IV[harm ? "harmonic" : keyMode === "major" ? "ionian" : "aeolian"];
  const strs = SET_STRS[drop](g);
  let prev = null;
  return DIATONIC7[harm ? "harmonic" : keyMode].map(([rn, q], k) => {
    const pcs = [0, 2, 4, 6].map((j) => (keyRoot + sc[(k + j) % 7]) % 12);
    const order = (drop === 3 ? DROP3 : DROP2)[inv].map((i) => pcs[i]);
    const up = (p, pc) => { let m = p; while (((m % 12) + 12) % 12 !== pc) m++; return m; };
    const build = (b) => { const ps = [b]; order.slice(1).forEach((pc) => ps.push(up(ps[ps.length - 1] + 1, pc))); return ps; };
    let bass;
    if (prev === null) { bass = up(tuning.openAbs[strs[0]] - 12, order[0]); while (build(bass).some((m, i) => m - tuning.openAbs[strs[i]] < 0)) bass += 12; }
    else bass = up(prev + 1, order[0]);
    prev = bass;
    let frets = build(bass).map((m, i) => m - tuning.openAbs[strs[i]]);
    if (Math.max(...frets) > tuning.frets) frets = frets.map((f) => f - 12);
    return { rn, root: pcs[0], q, cells: frets.map((f, i) => ({ s: strs[i], f, pc: (tuning.open[strs[i]] + f) % 12 })), frets };
  });
}

// Chord qualities whose CAGED form is read from the minor windows (Round 15).
const MINOR_Q = new Set(["min", "dim", "m7", "m7b5", "mmaj7", "dim7"]);
// Characters after a name's break point in the strip (Round 10): C♯m | (maj7), G♭ | maj7♯5.
const STRIP_BREAK = { mmaj7: 6, maj7s5: 6 };
// The chord strip: numeral, name and CAGED form per chord, a radio group with ◀ ▶ either side. Arrow keys move and choose
// inside it; on the page, ← and → step the chord when focus is not in another control group (Round 5).
function ChordStrip({ ladder, deg, setDeg, nameOf, forms }) {
  const ref = React.useRef(null);
  const step = (d) => setDeg((deg + d + 7) % 7);
  const onKeyDown = (e) => {
    const k = e.key;
    const d = k === "ArrowRight" || k === "ArrowDown" ? 1 : k === "ArrowLeft" || k === "ArrowUp" ? -1 : 0;
    if (!d && k !== "Home" && k !== "End") return;
    e.preventDefault();
    const n = k === "Home" ? 0 : k === "End" ? 6 : (deg + d + 7) % 7;
    setDeg(n);
    ref.current.querySelectorAll('[role="radio"]')[n].focus();
  };
  return (
    <div className="strip">
      <Btn onClick={() => step(-1)} aria-label="Previous chord">◀</Btn>
      <div ref={ref} className="striptrack" role="radiogroup" aria-label="Chords in the key" onKeyDown={onKeyDown}>
        {ladder.map((c, k) => (
          <button key={c.rn} role="radio" aria-checked={k === deg} tabIndex={k === deg ? 0 : -1} onClick={() => setDeg(k)} className="stripcell transition-colors"
            aria-label={`${c.rn}, ${nameOf(c)}${forms[k].length ? ", " + formName(forms[k]) : ""}`}
            style={{ background: k === deg ? THEME.ctlHover : "transparent", boxShadow: k === deg ? `0 0 0 1.5px ${THEME.text}` : "none", color: k === deg ? THEME.text : THEME.muted }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>{c.rn}</span>
            {/* m(maj7) and maj7♯5 (Round 10) can be too wide for a phone cell: they may break before "(maj7)" or "maj7♯5",
                as seventh frets break between pairs. */}
            {STRIP_BREAK[c.q] ? (() => {
              const n = nameOf(c), i = n.length - STRIP_BREAK[c.q];
              return (
                <span data-name style={{ fontSize: 12.5, fontWeight: k === deg ? 700 : 500, whiteSpace: "normal", textAlign: "center", lineHeight: 1.25 }}>
                  <span style={{ whiteSpace: "nowrap" }}>{n.slice(0, i)}</span><wbr /><span style={{ whiteSpace: "nowrap" }}>{n.slice(i)}</span>
                </span>
              );
            })() : <span style={{ fontSize: 12.5, fontWeight: k === deg ? 700 : 500 }}>{nameOf(c)}</span>}
            {/* The shape's CAGED form, underlined in its colour (split for two); no form, no line. */}
            <span data-form style={{ fontSize: 11, color: THEME.muted, minHeight: 15, lineHeight: "13px", paddingBottom: 2, backgroundImage: forms[k].length ? formUnderline(forms[k]) : "none", backgroundRepeat: "no-repeat", backgroundPosition: "bottom", backgroundSize: "100% 2px" }}>{formName(forms[k])}</span>
          </button>
        ))}
      </div>
      <Btn onClick={() => step(1)} aria-label="Next chord">▶</Btn>
    </div>
  );
}

const formUnderline = (fs) => (fs.length > 1 ? `linear-gradient(90deg, ${POS_COLOR[fs[0]]} 0 50%, ${POS_COLOR[fs[1]]} 50% 100%)` : `linear-gradient(${POS_COLOR[fs[0]]}, ${POS_COLOR[fs[0]]})`);

// lead: the Chord tab's Show and the Key (Build A). Scale behind is cut (streamline cut 16, TC 25 Nov).
export function ChordsPage({ tuning, cfg, update, ch, setCh, labelMode, setLabelMode, lead = null }) {
  const { keyRoot, keyMode } = cfg;
  const { deg, strSet, inv, sev, strSet7, inv7, drop3, strSet3, inv3, harm } = ch;
  // Triads, drop-2 and drop-3 sevenths each keep their own string set and inversion (Rounds 8 and 10).
  const d3 = sev && drop3, hm = sev && harm && keyMode === "minor";
  const g = sev ? (drop3 ? strSet3 : strSet7) : strSet, iv = sev ? (drop3 ? inv3 : inv7) : inv;
  const setDeg = (d) => setCh((c) => ({ ...c, deg: d }));
  const ladder = useMemo(() => (sev ? seventhLadder(tuning, keyRoot, keyMode, g, iv, d3 ? 3 : 2, hm) : triadLadder(tuning, keyRoot, keyMode, g, iv)), [tuning, keyRoot, keyMode, sev, g, iv, d3, hm]);
  const keySp = useMemo(() => (hm ? hmSpelling(keyRoot) : keySpelling(keyRoot, keyMode)), [keyRoot, keyMode, hm]);
  // accs: as uniAcc, with 𝄪 for the raised 7th of G♯ harmonic minor (F𝄪).
  const nameOf = (c) => accs(keySp[c.root].name) + CH_Q[c.q][1];
  const cur = ladder[deg];
  // Each shape's CAGED form (Round 15), from its own root.
  const forms = useMemo(() => ladder.map((c) => chordForms(c.root, MINOR_Q.has(c.q) ? "minor" : "major", c.q, c.cells)), [ladder]);
  const kDeg = hm ? KEY_DEG_HM : KEY_DEG[keyMode];
  // Labels (Round 15, shared with the other boards): Degrees from the chord's own root (R 3 5, ♭3, ♭5; ♯5 in maj7♯5,
  // 𝄫7 in dim7), note names, or none. The numerals above the neck carry the key function.
  const label = (pc, chordRoot, q) => {
    if (labelMode === "none") return "";
    if (labelMode === "name") return accs(keySp[pc].name);
    const d = (((pc - chordRoot) % 12) + 12) % 12;
    return (DEG_OVERRIDE[q] && DEG_OVERRIDE[q][d]) || DEG_LABEL[d];
  };
  const cell = {};
  ladder.forEach((c, k) => c.cells.forEach((x) => { cell[x.s * 100 + x.f] = { k, c }; }));
  const setStrs = sev ? SET_STRS[d3 ? 3 : 2](g) : [g, g + 1, g + 2];
  const onSet = (s) => setStrs.includes(s);

  // Scroll the chosen shape into view when the neck scrolls, as the Neck page does for a position.
  const scrollRef = React.useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const lo = el.querySelector(`[data-fret="${Math.max(0, Math.min(...cur.frets) - 1)}"]`), hi = el.querySelector(`[data-fret="${Math.min(tuning.frets, Math.max(...cur.frets) + 1)}"]`);
    if (!lo || !hi) return;
    const box = el.getBoundingClientRect(), l = lo.getBoundingClientRect().left - box.left + el.scrollLeft, r = hi.getBoundingClientRect().right - box.left + el.scrollLeft;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, (l + r) / 2 - el.clientWidth / 2), behavior: smooth ? "smooth" : "auto" });
  }, [tuning, deg, sev, g, iv, d3, hm, keyRoot, keyMode]);

  // ← and → step the chord from anywhere on the page except inside a control group, which keeps its own arrow keys.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('[role="radiogroup"], input, select, textarea')) return;
      e.preventDefault();
      setCh((c) => ({ ...c, deg: (c.deg + (e.key === "ArrowRight" ? 1 : -1) + 7) % 7 }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const cellH = 46, fontPx = 11;
  const COLS = `30px ${colPx(tuning.frets).map((n) => `minmax(${n}px, ${n}fr)`).join(" ")}`;
  const renderRow = (s) => {
    const cells = [];
    for (let f = 0; f <= tuning.frets; f++) {
      const pc = (tuning.open[s] + f) % 12;
      const hit = cell[s * 100 + f];
      let dot = null;
      if (hit) {
        const isRoot = pc === hit.c.root;
        const lab = hit.k === deg ? label(pc, hit.c.root, hit.c.q) : "";
        const title = `${hit.c.rn} ${nameOf(hit.c)} · ${accs(keySp[pc].name)}`;
        const fill = formFill(forms[hit.k]);
        if (hit.k === deg) {
          // The chosen shape: filled in its CAGED form colour with ink labels; its root has the ink frame (Build A).
          dot = isRoot ? (
            <div data-shape={hit.k} data-chosen="1" data-root="1" title={title} className={"fdot " + ROOT + " relative flex items-center justify-center"} style={{ width: 30, height: 30, background: fill, color: THEME.ink, fontSize: fontPx, fontWeight: 800, zIndex: 5 }}>{lab}</div>
          ) : (
            <div data-shape={hit.k} data-chosen="1" title={title} className={"fdot " + TILE + " relative flex items-center justify-center"} style={{ width: 30, height: 30, background: fill, color: THEME.ink, fontSize: fontPx, fontWeight: 800, zIndex: 3 }}>{lab}</div>
          );
        } else {
          // The other six: open squares outlined in their form colour, no labels; a root has the heavier outline.
          dot = <div data-shape={hit.k} data-root={isRoot ? "1" : undefined} title={title} className={TILE + " relative"} style={{ width: 26, height: 26, background: forms[hit.k].length ? fill : THEME.edge, zIndex: 2, ...outlineMask(isRoot ? 3.5 : 2) }} />;
        }
      }
      cells.push(
        <div key={f} data-fret={s === 0 ? f : undefined} className="relative flex items-center justify-center" style={{ gridRow: s + 2, gridColumn: f + 2, height: cellH, borderRight: f === 0 ? `5px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, background: f === 0 ? THEME.track : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: 11, height: 11 }} />}
          <div className="absolute left-0 right-0" style={{ top: "50%", transform: "translateY(-50%)", height: tuning.gauges[s], background: THEME.edge }} />
          {dot}
        </div>
      );
    }
    return (
      <div key={s} className="contents">
        <div className="flex items-center justify-center text-xs font-semibold" style={{ gridRow: s + 2, gridColumn: 1, height: cellH, color: onSet(s) ? THEME.text : THEME.muted }}>{tuning.labels[s]}</div>
        {cells}
      </div>
    );
  };

  const keyName = uniAcc(KEY_NAME[keyMode][keyRoot]);
  const summary = `${keyName} ${hm ? "harmonic minor" : keyMode} · ${cur.rn} · ${accs(keySp[cur.root].name)} ${CH_Q[cur.q][0]} · ${d3 ? "drop 3, " : ""}strings ${(sev ? (d3 ? SET_NAME3 : SET_NAME7) : SET_NAME)[g]}, ${(sev ? INV_NAME7 : INV_NAME)[iv]}`;
  const opt = (k, v) => setCh((c) => ({ ...c, [k]: v }));

  return (
    <div>
      {/* The bar (Build A): Show and Key (lead), then the ladder's own controls. */}
      <Bar>
        {lead}
        <Grp cap="Chords">
          <Track label="Chords" cols={2}>{[[false,"Triads"],[true,"Sevenths"]].map(([v,l]) => <Seg key={l} active={sev === v} onClick={() => opt("sev", v)}>{l}</Seg>)}</Track>
        </Grp>
        {/* Round 10: Voicing (Drop 2 / Drop 3) and, in a minor key, Minor scale (Natural / Harmonic) for Sevenths only. */}
        {sev && <Grp cap="Voicing">
          <Track label="Voicing" cols={2}>{[[false,"Drop 2"],[true,"Drop 3"]].map(([v,l]) => <Seg key={l} active={drop3 === v} onClick={() => opt("drop3", v)}>{l}</Seg>)}</Track>
        </Grp>}
        {sev && keyMode === "minor" && <Grp cap="Minor scale">
          <Track label="Minor scale" cols={2}>{[[false,"Natural"],[true,"Harmonic"]].map(([v,l]) => <Seg key={l} active={harm === v} onClick={() => opt("harm", v)}>{l}</Seg>)}</Track>
        </Grp>}
        <Grp cap="Strings">
          <Track label="Strings" cols={sev ? (drop3 ? 2 : 3) : 4}>{(sev ? (drop3 ? SET_NAME3 : SET_NAME7) : SET_NAME).map((l, j) => <Seg key={l} active={g === j} onClick={() => opt(sev ? (drop3 ? "strSet3" : "strSet7") : "strSet", j)}>{l}</Seg>)}</Track>
        </Grp>
        <Grp cap="Inversion">
          <Track label="Inversion" cols={sev ? 4 : 3}>{["Root", "1st", "2nd", "3rd"].slice(0, sev ? 4 : 3).map((l, i) => <Seg key={i} active={iv === i} onClick={() => opt(sev ? (drop3 ? "inv3" : "inv7") : "inv", i)}>{l}</Seg>)}</Track>
        </Grp>
      </Bar>
      <div className="boardwrap">
        <div className="sumrow">
          <span data-summary aria-live="polite" className="text-sm font-semibold text-body">{summary}</span>
          <Labels value={labelMode} set={setLabelMode} />
        </div>
        <div ref={scrollRef} className="overflow-x-auto pb-2 rounded-xl" style={{ background: THEME.panel2 }}>
          <div className="grid p-3" style={{ gridTemplateColumns: COLS, width: "100%", minWidth: "min-content" }}>
            {/* Roman numerals above the neck, each centred over its shape's frets; the chosen one in text colour. */}
            {ladder.map((c, k) => (
              <div key={"rn" + c.rn} data-numeral={k} className="flex items-end justify-center" style={{ gridRow: 1, gridColumn: `${Math.min(...c.frets) + 2} / ${Math.max(...c.frets) + 3}`, height: 22, paddingBottom: 2, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", color: k === deg ? THEME.text : THEME.muted }}>{c.rn}</div>
            ))}
            <div style={{ gridRow: 1, gridColumn: 1, height: 22 }} />
            {Array.from({ length: tuning.strings }, (_, s) => renderRow(s))}
            {Array.from({ length: tuning.frets + 1 }, (_, f) => (
              <div key={"n" + f} className="flex items-center justify-center text-xs" style={{ gridRow: tuning.strings + 2, gridColumn: f + 2, height: 24, color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</div>
            ))}
          </div>
        </div>
        <ChordStrip ladder={ladder} deg={deg} setDeg={setDeg} nameOf={nameOf} forms={forms} />
      </div>

    </div>
  );
}
