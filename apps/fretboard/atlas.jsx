// Fretboard Trainer · the Atlas page: windows as cards, the small neck and the neck map.
import { useState, useMemo } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { NOTES_SHARP } from "../../core/notes.js";
import { MODE_NAME, MODES, OTHER_SCALES, MODE_Q, MODE_REF, MODE_REF_OFF } from "../../core/scales.js";
import { accs, spellAt, autoLetter, neckLetter, normSpell } from "../../core/spelling.js";
import { NOTE_TOK } from "../../core/link.js";
import { Seg, Track, Row, Card, Btn, useMedia, PHONE_Q, Dialog } from "../../core/ui.jsx";
import { atType, atScale, CardGrid, AtlasCard } from "../../core/atlas.jsx";
import { MARKERS, colPx, SET_NAME, inlayAt } from "./guitar.js";
import { ringMask } from "../../core/marker.js";
import { POS_COLOR, POS_MAJOR, POS_MINOR, CAGED_ANCHOR } from "./caged.js";
import { keepChord } from "./state.js";
import { gapCells } from "./neck.jsx";
import { ChordsMode } from "./atlaschords.jsx";

// Atlas page (Round 11, Atlas review and mock-up of 18 Nov): a scale as a grid of small necks, one card per shape. Scales mode
// is built here; Chords mode (Round 14) is atlaschords.jsx. Key, Major / Minor and Mode are the Neck's (cfg), and Labels is the Neck's Labels, so
// the four pages stay on one key; Show, Lay out by and the filters are the Atlas's own (at).
const AT_SHOW = [["scale","Scale"],["pentatonic","Pentatonic"],["blues","Blues"]];
const AT_BY = [["position","Position"],["mode","Mode"],["key","Key"]];
const SCALE_LABEL = Object.fromEntries([...MODES, ...OTHER_SCALES]);
const AT_POS = (km) => (km === "major" ? POS_MAJOR : POS_MINOR);
// The cells of one copy of window p: k = 0 is the lowest complete copy, 12 the copy 12 frets up. With fill (Scale only), the
// gap fill of gapCells as exact cells: each pitch missing between the copy's lowest and highest takes the nearest on-board
// cell outside the lowest copy, a tie going above; the upper copy takes the same cell 12 frets up or, where that passes the
// last fret, the nearest on-board cell outside the upper copy.
function atCells(tuning, root, set, p, k, fill) {
  const base = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12, top = base + p.w;
  const inSet = (m) => set.has((((m - root) % 12) + 12) % 12);
  const near = (m, b, t) => {
    let best = null;
    for (let s = 0; s < tuning.strings; s++) {
      const f = m - tuning.openAbs[s];
      if (f < 0 || f > tuning.frets || (f >= b && f <= t)) continue;
      const d = f < b ? b - f : f - t;
      if (!best || d < best.d || (d === best.d && f > t)) best = { s, f, d };
    }
    return best;
  };
  const cells = [], have = new Set();
  for (let s = 0; s < tuning.strings; s++) for (let f = base; f <= top; f++) if (inSet(tuning.openAbs[s] + f)) { have.add(tuning.openAbs[s] + f); cells.push({ s, f: f + k, gap: false }); }
  if (fill && have.size) {
    const lo = Math.min(...have), hi = Math.max(...have);
    for (let m = lo + 1; m < hi; m++) {
      if (!inSet(m) || have.has(m)) continue;
      let g = near(m, base, top);
      if (g && k) g = g.f + k <= tuning.frets ? { s: g.s, f: g.f + k } : near(m + k, base + k, top + k);
      if (g) cells.push({ s: g.s, f: g.f, gap: true });
    }
  }
  return cells;
}
// A card's neck: six fret columns (more if the dots span more), the dots centred with the spare column above them.
function atFrame(tuning, cells) {
  const fs = cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
  const span = hi - lo + 1, cols = Math.max(6, span);
  return { lo, hi, cols, start: Math.max(0, Math.min(tuning.frets - cols + 1, lo - Math.floor((cols - span) / 2))) };
}
// The cards for the current state. Position: the five windows of the scale, low fret to high. Mode: the seven modes in one
// window number, from the same root or from the parent major key (each mode in its own window of that number; root letters
// as the Modes page spells them). Key: the scale in one window in all 12 keys, C up to B. Also 12 up adds each window's copy
// 12 frets higher where all of it fits on the neck.
function atCards(tuning, cfg, at) {
  const { keyRoot, keyMode, mode } = cfg, { show, by, pos, from, up } = at;
  const out = [];
  const add = (id, title, sc, p, tags) => [0, 12].forEach((k) => {
    const base = (((sc.root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
    if (k && (!up || base + p.w + k > tuning.frets)) return;
    const cells = atCells(tuning, sc.root, sc.set, p, k, sc.show === "scale");
    out.push({ id: id + (k ? "u" : ""), title: title + (k ? " · 12 up" : ""), sc, p, k, at: base + k, cells, tags, ...atFrame(tuning, cells) });
  });
  const typeTag = show === "scale" ? SCALE_LABEL[mode] : `${keyMode} ${show}`;
  if (by === "mode") {
    MODES.forEach(([m], i) => {
      const km = MODE_Q(m), parent = from === "parent";
      const sc = atScale(parent ? (keyRoot + MODE_REF_OFF[i]) % 12 : keyRoot, km, "scale", m, parent ? MODE_REF.keys[MODE_REF.order[keyRoot]][i][0] : cfg.keySpell);
      add(m, `${sc.rootName} ${MODE_NAME[m]}`, sc, AT_POS(km).find((p) => p.num === pos), [km]);
    });
  } else if (by === "key") {
    NOTE_TOK.forEach((tok, r) => {
      const sc = atScale(r, keyMode, show, mode, r === keyRoot ? cfg.keySpell : null);
      add(tok, `${sc.rootName} ${atType(show, keyMode, mode)}`, sc, AT_POS(keyMode).find((p) => p.num === pos), [typeTag]);
    });
  } else {
    const sc = atScale(keyRoot, keyMode, show, mode, cfg.keySpell);
    AT_POS(keyMode).forEach((p) => add(String(p.num), `${p.letter} shape`, sc, p, [typeTag]));
    out.sort((a, b) => a.at - b.at);
  }
  return out;
}

// A card's neck: the window's cells in its colour, chord tones larger when asked, the root with an ink centre; strings
// outside the Strings filter as open circles. Spans only, so the whole neck can sit inside the card's button.
function MiniNeck({ tuning, card, labelMode, big, str, lg }) {
  const { sc, p, cells, start, cols } = card;
  const rowH = lg ? 34 : 28, d1 = lg ? 26 : 22, d2 = lg ? 22 : 18, fs = lg ? 12 : 11, col = POS_COLOR[p.letter];
  const hit = {};
  cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const out = [];
  for (let s = 0; s < tuning.strings; s++) {
    const off = str !== null && (s < str || s > str + 2);
    out.push(<span key={"l" + s} className="mn-c" style={{ height: rowH, fontSize: 11, fontWeight: 600, color: off ? THEME.muted : THEME.text }}>{tuning.labels[s]}</span>);
    for (let f = start; f < start + cols; f++) {
      const c = hit[s * 100 + f];
      let dot = null;
      if (c) {
        const pc = (tuning.open[s] + f) % 12, iv = (((pc - sc.root) % 12) + 12) % 12, isRoot = iv === 0, isCT = sc.ct.has(iv);
        const sz = isRoot || !big || isCT ? d1 : d2, lab = labelMode === "name" ? sc.name(pc) : labelMode === "degree" ? sc.deg(iv) : "";
        const data = { "data-c": `${s}-${f}`, "data-gap": c.gap ? "1" : undefined, "data-off": off ? "1" : undefined, title: `${sc.name(pc)} · ${sc.deg(iv)}` };
        dot = off
          ? <span {...data} className="mn-d" style={{ width: sz, height: sz, border: `${isRoot ? 3 : 1.5}px solid ${THEME.edge}`, color: THEME.muted, fontSize: fs, fontWeight: 500, zIndex: 2 }}>{lab}</span>
          : isRoot
            ? <span {...data} data-ring="1" className="mn-d fdot" style={{ width: sz + 4, height: sz + 4, background: col, color: THEME.ink, fontSize: fs, fontWeight: 800, zIndex: 5, ...ringMask(2, 1.5) }}>{lab}</span>
            : <span {...data} className="mn-d fdot" style={{ width: sz, height: sz, background: col, color: THEME.ink, fontSize: fs, fontWeight: big && isCT ? 800 : 500, zIndex: isCT ? 3 : 2 }}>{lab}</span>;
      }
      out.push(
        <span key={s + "-" + f} className="mn-c" style={{ height: rowH, borderRight: f === 0 ? `4px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, background: f === 0 ? THEME.track : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: lg ? 9 : 8, height: lg ? 9 : 8 }} />}
          <span className="mn-s" style={{ height: tuning.gauges[s], marginTop: -tuning.gauges[s] / 2 }} />
          {dot}
        </span>
      );
    }
  }
  out.push(<span key="n" />);
  for (let f = start; f < start + cols; f++) out.push(<span key={"n" + f} className="mn-c" style={{ height: 16, fontSize: 11, color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</span>);
  return <span className="mneck" aria-hidden="true"><span className="mn-g" style={{ gridTemplateColumns: `16px repeat(${cols}, minmax(0, 1fr))` }}>{out}</span></span>;
}

// The neck map (mock-up, canvas comments of 18 Nov): the whole neck as a slim strip above the cards. With no card chosen it
// shows the scale in CAGED colours, half and half where two windows share a note, as the Neck does in All. A chosen or
// hovered card lights its window in every copy on the neck, gap fill included, and the rest go to open circles; the ruler
// names each window's span.
function NeckMap({ tuning, sc, p, str, phone, note }) {
  const posList = AT_POS(sc.keyMode);
  const baseOf = (q) => (((sc.root - CAGED_ANCHOR + q.off) % 12) + 12) % 12;
  const inPos = (f, q) => ((((f - baseOf(q)) % 12) + 12) % 12) <= q.w;
  const gaps = p && sc.show === "scale" ? gapCells(tuning, sc.root, sc.set, p) : null;
  const inWin = (s, f) => inPos(f, p) || (gaps !== null && (gaps.has(s * 12 + (f % 12)) || gaps.cut.has(s * 100 + f)));
  const spans = [];
  posList.forEach((q) => {
    for (let c = baseOf(q) - 12; c <= tuning.frets; c += 12) {
      const a = Math.max(0, c), z = Math.min(tuning.frets, c + q.w);
      if (z >= a) spans.push({ q, a, z, clipped: a !== c || z !== c + q.w });
    }
  });
  spans.sort((x, y) => x.a - y.a || x.z - y.z);
  const ends = [];
  spans.forEach((sp) => {
    let l = ends.findIndex((e) => e < sp.a);
    if (l < 0) { l = ends.length; ends.push(-1); }
    ends[l] = sp.z; sp.lane = l;
  });
  const lanes = Math.max(2, ends.length), rowH = 16, dot = phone ? 9 : 11;
  const cellsOut = [];
  for (let s = 0; s < tuning.strings; s++) {
    const off = str !== null && (s < str || s > str + 2);
    cellsOut.push(<div key={"l" + s} className="nm-c" style={{ gridRow: s + 1, gridColumn: 1, height: rowH, fontSize: 11, color: THEME.muted }}>{tuning.labels[s]}</div>);
    for (let f = 0; f <= tuning.frets; f++) {
      const iv = (((tuning.open[s] + f - sc.root) % 12) + 12) % 12;
      let mark = null;
      if (sc.set.has(iv)) {
        const isRoot = iv === 0, on = !off && (p ? inWin(s, f) : true);
        let fill = null;
        if (on && p) fill = POS_COLOR[p.letter];
        else if (on) {
          const hits = posList.filter((q) => inPos(f, q)).sort((a, b) => ((((f - baseOf(b)) % 12) + 12) % 12) - ((((f - baseOf(a)) % 12) + 12) % 12)).map((q) => POS_COLOR[q.letter]);
          fill = hits.length > 1 ? `linear-gradient(135deg, ${hits[0]} 0 50%, ${hits[1]} 50% 100%)` : hits[0];
        }
        mark = fill
          ? <span data-m={`${s}-${f}`} className="mn-d fdot" style={{ width: dot + (isRoot ? 4 : 0), height: dot + (isRoot ? 4 : 0), background: fill, zIndex: 2, ...(isRoot ? ringMask(1.5, 1) : {}) }} />
          : <span className="mn-d" style={{ width: dot, height: dot, border: `${isRoot ? 2 : 1}px solid ${THEME.edge}`, background: THEME.panel2, zIndex: 1 }} />;
      }
      cellsOut.push(
        <div key={s + "-" + f} className="nm-c" style={{ gridRow: s + 1, gridColumn: f + 2, height: rowH, borderRight: f === 0 ? `3px solid ${THEME.nut}` : `1px solid ${THEME.fret}` }}>
          <span className="mn-s" style={{ height: 1, marginTop: -0.5 }} />
          {mark}
        </div>
      );
    }
  }
  return (
    <section className="nmap" aria-label="Neck map">
      <div className="nm-head"><h2>Neck map</h2><span data-mapnote className="text-xs text-muted">{note}</span></div>
      <div role="img" aria-label={`The whole neck. ${note}`} className="nm-g" style={{ gridTemplateColumns: `14px ${colPx(tuning.frets).map((n) => `minmax(0, ${n}fr)`).join(" ")}` }}>
        {cellsOut}
        {Array.from({ length: tuning.frets + 1 }, (_, f) => (!phone || MARKERS[f]) && (
          <div key={"n" + f} className="nm-c" style={{ gridRow: tuning.strings + 1, gridColumn: f + 2, height: rowH, fontSize: 11, overflow: "visible", color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</div>
        ))}
        {Array.from({ length: lanes }, (_, l) => <div key={"rl" + l} style={{ gridRow: tuning.strings + 2 + l, gridColumn: 1, height: 18 }} />)}
        {spans.map((sp) => {
          const on = !p || sp.q.num === p.num, c = on ? POS_COLOR[sp.q.letter] : THEME.line, side = on && p ? 2 : 1;
          return (
            <div key={`r${sp.q.num}-${sp.a}`} data-mruler={`${sp.q.num} ${sp.q.letter}`} data-on={on && p ? "1" : undefined} className="nm-r"
              style={{ gridRow: tuning.strings + 2 + sp.lane, gridColumn: `${sp.a + 2} / ${sp.z + 3}`, color: on && p ? THEME.text : THEME.muted, fontWeight: on && p ? 700 : 400,
                borderBottom: `${on && p ? 2 : 1}px solid ${c}`, borderLeft: sp.clipped && sp.a === 0 ? "none" : `${side}px solid ${c}`, borderRight: sp.clipped && sp.z === tuning.frets ? "none" : `${side}px solid ${c}` }}>
              {phone ? sp.q.letter : `${sp.q.num} ${sp.q.letter}`}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AtlasPage({ tuning, cfg, update, at, setAt, labelMode, setLabelMode, onOpen, onOpenChord }) {
  const { keyRoot, keyMode, mode } = cfg, { am, show, by, pos, from, str, up, ct, size, lit } = at;
  const phone = useMedia(PHONE_Q);
  const [hov, setHov] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState("");
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  const cards = useMemo(() => atCards(tuning, cfg, at), [tuning, keyRoot, keyMode, mode, cfg.keySpell, show, by, pos, from, up]);
  const mapOn = at.map === null ? !phone : at.map;
  const litCard = cards.find((c) => c.id === lit) || null, target = cards.find((c) => c.id === hov) || litCard;

  // Names. The Key grid spells each root as the Neck would for the scale shown; Lay out by Mode spells it by the key
  // (parent keys as the Modes page does), since the scale changes from card to card.
  const vc = normSpell({ ...cfg, scope: by === "mode" ? "pentatonic" : show });
  const keyCell = (i) => (by === "mode" && from === "parent" ? MODE_REF.order[i] : accs(spellAt(i === keyRoot ? neckLetter(vc) : autoLetter(i, vc), i)));
  const type = atType(show, keyMode, mode), Type = type[0].toUpperCase() + type.slice(1);
  const win = `window ${pos} ${AT_POS("major").find((p) => p.num === pos).letter}`;
  const noun = by === "mode" ? "modes" : by === "key" ? "keys" : "windows";
  const scaleName = by === "mode" ? (from === "parent" ? `Modes of ${keyCell(keyRoot)} major` : `${keyCell(keyRoot)} modes`) : by === "key" ? `${Type}, 12 keys` : `${keyCell(keyRoot)} ${type}`;
  const labNote = labelMode === "name" ? " · note names" : labelMode === "none" ? " · no labels" : "";
  const summary = (by === "mode" ? `${keyCell(keyRoot)}${from === "parent" ? " major" : ""} · 7 modes, ${from === "parent" ? "same notes" : "same root"} · ${win}`
    : by === "key" ? `${Type} · 12 keys · ${win}`
    : `${keyCell(keyRoot)} ${type} · ${cards.length} windows`) + labNote;
  const heading = by === "mode" ? [from === "parent" ? `Modes of ${keyCell(keyRoot)} major (parent)` : `Modes of ${keyCell(keyRoot)} (parallel)`, from === "parent" ? "notes fixed, root changes" : "root fixed, notes change"]
    : by === "key" ? ["Keys", "C up to B"] : ["Positions", "low fret to high"];
  const chips = [str !== null && [`Strings ${SET_NAME[str]}`, () => set({ str: null })], up && ["Also 12 up", () => set({ up: false })]].filter(Boolean);
  const clear = () => set({ str: null, up: false });

  // The neck map shows the hovered or chosen card. With none, Position shows the scale with every window; Mode and Key,
  // where each card is another scale, show the first card, or the current key's card.
  const home = by === "position" ? null : by === "key" ? cards.find((c) => c.sc.root === keyRoot) : cards[0];
  const mapSc = target ? target.sc : home ? home.sc : atScale(keyRoot, keyMode, show, mode, cfg.keySpell);
  const tapWord = phone ? "Tap" : "Hover or tap";
  const mapNote = target ? `Showing ${target.title.replace(" · 12 up", "")}${by === "position" ? "" : `, ${win}`}` : home ? `Showing ${home.title}, every window. ${tapWord} a card to light its window` : `${tapWord} a card to light its window`;

  // Control rows, shared by the cards (tablet and desktop), the Filters sheet and the Key / Scale picker (phone).
  const keyGrid = (
    <Track label="Key" cols={6}>{NOTES_SHARP.map((n, i) => <Seg key={i} tone="gold" disabled={by === "key"} active={keyRoot === i} onClick={() => update({ root: i, keyRoot: i, ...keepChord(cfg, keyMode) })}>{keyCell(i)}</Seg>)}</Track>
  );
  const majMin = (
    <Track label="Major or minor" cols={2}>{[["major","Major"],["minor","Minor"]].map(([t, l]) => <Seg key={t} tone="gold" disabled={by === "mode"} active={keyMode === t} onClick={() => update({ keyMode: t, root: keyRoot, ...keepChord(cfg, t), mode: keyMode === t && MODE_Q(mode) === t ? mode : t === "major" ? "ionian" : "aeolian" })}>{l}</Seg>)}</Track>
  );
  const showRow = (
    <Row label="Show">
      <Track label="Show" cols={3}>{AT_SHOW.map(([k, l]) => <Seg key={k} active={show === k} onClick={() => set({ show: k, by: k !== "scale" && by === "mode" ? "position" : by })}>{l}</Seg>)}</Track>
    </Row>
  );
  const modeRows = by === "mode" ? (
    <Row label="Modes from">
      <Track label="Modes from" cols={2}>{[["root","Same root"],["parent","Parent key"]].map(([k, l]) => <Seg key={k} active={from === k} onClick={() => set({ from: k })}>{l}</Seg>)}</Track>
    </Row>
  ) : show === "scale" ? [["Mode", MODES, 4], ["Other scales", OTHER_SCALES, 2]].map(([lab, list, n]) => (
    <Row key={lab} label={lab}>
      <Track label={lab} cols={n}>{list.map(([k, l]) => <Seg key={k} active={mode === k} onClick={() => {
        const q = MODE_Q(k);
        update(q === keyMode ? { mode: k } : { mode: k, keyMode: q, root: keyRoot, ...keepChord(cfg, q) });
      }}>{l}</Seg>)}</Track>
    </Row>
  )) : null;
  const byRows = (
    <React.Fragment>
      <Row>
        <Track label="Lay out by" cols={3}>{AT_BY.map(([k, l]) => <Seg key={k} active={by === k} disabled={k === "mode" && show !== "scale"} onClick={() => set({ by: k, lit: null })}>{l}</Seg>)}</Track>
      </Row>
      {show !== "scale" && <p className="text-xs text-muted" style={{ margin: 0 }}>Mode is for Show: Scale.</p>}
      {by !== "position" && (
        <Row label="Position">
          <Track label="Position" cols={5}>{AT_POS("major").map((p) => <Seg key={p.num} active={pos === p.num} onClick={() => set({ pos: p.num })} pos={POS_COLOR[p.letter]} aria-label={`${p.num} ${p.letter}`}><span aria-hidden="true" style={{ fontSize: 11, fontWeight: 500, marginRight: 3 }}>{p.num}</span>{p.letter}</Seg>)}</Track>
        </Row>
      )}
    </React.Fragment>
  );
  const filterRows = (
    <React.Fragment>
      <Row label="Strings">
        <Track label="Strings" cols={5}>
          <Seg active={str === null} onClick={() => set({ str: null })}>All</Seg>
          {SET_NAME.map((l, g) => <Seg key={g} active={str === g} onClick={() => set({ str: g })}>{l}</Seg>)}
        </Track>
      </Row>
      <Row label="Copies">
        <Track label="Copies" cols={2}>{[[false,"Lowest"],[true,"Also 12 up"]].map(([v, l]) => <Seg key={l} active={up === v} onClick={() => set({ up: v })}>{l}</Seg>)}</Track>
      </Row>
      <Row label="Chord tones">
        <Track label="Chord tones" cols={2}>{[["larger","Larger"],["same","Same size"]].map(([k, l]) => <Seg key={k} active={ct === k} onClick={() => set({ ct: k })}>{l}</Seg>)}</Track>
      </Row>
    </React.Fragment>
  );
  const displayRows = (
    <React.Fragment>
      <Row label="Labels">
        <Track label="Labels" cols={3}>{[["degree","Degrees"],["name","Notes"],["none","None"]].map(([k, l]) => <Seg key={k} active={labelMode === k} onClick={() => setLabelMode(k)}>{l}</Seg>)}</Track>
      </Row>
      <Row label="Card size">
        <Track label="Card size" cols={2}>{[["standard","Standard"],["large","Large"]].map(([k, l]) => <Seg key={k} active={size === k} onClick={() => set({ size: k })}>{l}</Seg>)}</Track>
      </Row>
    </React.Fragment>
  );
  const drop = <span aria-hidden="true" className="text-muted" style={{ marginLeft: 6 }}>▾</span>;

  return (
    <div>
      <div className="amode">
        <Track label="Atlas mode" cols={2}>{[["scales","Scales"],["chords","Chords"]].map(([k, l]) => <Seg key={k} active={am === k} onClick={() => set({ am: k })}>{l}</Seg>)}</Track>
      </div>
      {am === "chords" ? (
        <ChordsMode tuning={tuning} at={at} setAt={setAt} labelMode={labelMode} setLabelMode={setLabelMode} onOpen={onOpenChord} />
      ) : (
        <React.Fragment>
          {phone ? (
            <div className="abar" role="group" aria-label="Atlas controls">
              <Btn onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={`Filters${chips.length ? `, ${chips.length} active` : ""}`}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" style={{ marginRight: 6, verticalAlign: "-3px" }}><path d="M2 4h12M4.5 8h7M7 12h2" /></svg>
                Filters{chips.length > 0 && <span className="abadge">{chips.length}</span>}
              </Btn>
              <Btn data-pill onClick={() => setPick(true)} aria-haspopup="dialog">{scaleName}{drop}</Btn>
              <Btn onClick={() => setSheet(true)} aria-haspopup="dialog">By {by}</Btn>
              {chips.map(([t, rm]) => (
                <button key={t} onClick={rm} aria-label={`Remove ${t}`} className="chip flex items-center gap-1.5 px-2 rounded-lg text-xs transition-colors" style={{ background: THEME.ctl, border: `1px solid ${THEME.edge}`, color: THEME.text, fontWeight: 500, flex: "none" }}>
                  {t}<span aria-hidden="true" className="text-muted">✕</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="agroups">
              <Card title="Scale">
                <Row label="Key">{keyGrid}</Row>
                <Row>{majMin}</Row>
                {showRow}
                {modeRows}
              </Card>
              <Card title="Lay out by">{byRows}</Card>
              <Card title="Filter">{filterRows}</Card>
              <Card title="Display">{displayRows}</Card>
            </div>
          )}

          <div className="asum">
            <div className="asum-l">
              <span data-summary aria-live="polite" className="text-sm font-semibold text-body">{summary}</span>
              {!phone && chips.map(([t, rm]) => (
                <button key={t} onClick={rm} aria-label={`Remove ${t}`} className="chip flex items-center gap-1.5 px-2 rounded-lg text-xs transition-colors" style={{ background: THEME.ctl, border: `1px solid ${THEME.edge}`, color: THEME.text, fontWeight: 500, flex: "none" }}>
                  {t}<span aria-hidden="true" className="text-muted">✕</span>
                </button>
              ))}
            </div>
            <Btn onClick={() => set({ map: !mapOn })} aria-pressed={mapOn}>Neck map</Btn>
          </div>

          {mapOn && <NeckMap tuning={tuning} sc={mapSc} p={target ? target.p : null} str={str} phone={phone} note={mapNote} />}

          <CardGrid heading={heading} count={cards.length} large={size === "large"}>
            {cards.map((c) => {
              const on = c.id === lit;
              return (
                <AtlasCard key={c.id} card={c} on={on} onToggle={() => set({ lit: on ? null : c.id })} setHov={setHov} onOpen={() => onOpen(c, str)}
                  mark={<React.Fragment>{c.p.num} {c.p.letter}</React.Fragment>} markColour={POS_COLOR[c.p.letter]}>
                  <MiniNeck tuning={tuning} card={c} labelMode={labelMode} big={ct === "larger"} str={str} lg={size === "large"} />
                </AtlasCard>
              );
            })}
          </CardGrid>

          {/* Phone: the Key / Scale picker from the chip bar, and the Filters sheet with every control (mock-up frames). */}
          {phone && pick && (
            <Dialog label="Key and scale" kind="apop" onClose={() => setPick(false)}>
              <div className="flex items-center"><h2 className="adlg-h">{scaleName}</h2><Btn onClick={() => setPick(false)}>Done</Btn></div>
              <Row label="Key">{keyGrid}</Row>
              <Row>{majMin}</Row>
              {showRow}
              {modeRows}
            </Dialog>
          )}
          {phone && sheet && (
            <Dialog label="Filters" kind="asheet" onClose={() => setSheet(false)}>
              <div aria-hidden="true" className="agrip" />
              <div className="flex items-center" style={{ padding: "8px 16px 0" }}><h2 className="adlg-h">Filters</h2><Btn onClick={clear} disabled={!chips.length}>Reset</Btn></div>
              <div className="asheet-body">
                <section className="asec" aria-label="Scale">
                  <h3>Scale</h3>
                  {/* The one-row picker (canvas comment, 18 Nov): Key and Scale each open their grid below the row. */}
                  <div className="apick2">
                    <Btn onClick={() => setOpen(open === "key" ? "" : "key")} aria-expanded={open === "key"} disabled={by === "key"} className="btn text-sm transition-colors apbtn"><span className="text-muted" style={{ fontWeight: 500 }}>Key</span><span style={{ fontWeight: 700, marginLeft: "auto" }}>{by === "key" ? "All 12" : keyCell(keyRoot)}</span>{drop}</Btn>
                    <Btn onClick={() => setOpen(open === "scale" ? "" : "scale")} aria-expanded={open === "scale"} className="btn text-sm transition-colors apbtn"><span className="text-muted" style={{ fontWeight: 500 }}>Scale</span><span style={{ fontWeight: 700, marginLeft: "auto", overflow: "hidden", textOverflow: "ellipsis" }}>{by === "mode" ? "7 modes" : show === "scale" ? SCALE_LABEL[mode] : AT_SHOW.find(([k]) => k === show)[1]}</span>{drop}</Btn>
                  </div>
                  {open === "key" && <Row>{keyGrid}</Row>}
                  {open === "scale" && <React.Fragment>{showRow}{modeRows}</React.Fragment>}
                  <Row>{majMin}</Row>
                </section>
                <section className="asec" aria-label="Lay out by"><h3>Lay out by</h3>{byRows}</section>
                <section className="asec" aria-label="Filter"><h3>Filter</h3>{filterRows}</section>
                <section className="asec" aria-label="Display"><h3>Display</h3>{displayRows}</section>
              </div>
              <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${THEME.line}` }}>
                <Btn data-show onClick={() => setSheet(false)} className="btn text-sm transition-colors ashow">Show {cards.length} {noun}</Btn>
              </div>
            </Dialog>
          )}
        </React.Fragment>
      )}
    </div>
  );
}
