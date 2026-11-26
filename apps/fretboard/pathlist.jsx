// Fretboard Trainer · the Scale tab's list (Build B, E9 model; mock-up of 25 Nov, calls 1, 3 and 4): Runs | Positions, sortable
// columns, the Runs filters (Strings, Octaves, Starts on, Span), Rows | Cards, and the panel under the neck with ▲ ▼ (the
// row before or after) and ‹ › (the chosen path's notes, low to high). Position left the bar for this list (call 1):
// a window row sets the board's Position as the bar did (all copies, gap fill; TC 25 Nov), All keeps the five together.
import { useMemo, useEffect, useState } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { MODE_NAME, scopeIntervals } from "../../core/scales.js";
import { atScale } from "../../core/atlas.jsx";
import { Seg, Track, Btn, Bar, Grp, ClearAll } from "../../core/ui.jsx";
import { TILE, ROOT } from "../../core/marker.js";
import { MARKERS, inlayAt, inRange } from "./guitar.js";
import { POS_COLOR, POS_MAJOR, POS_MINOR, CAGED_ANCHOR, winsAt, coverWins } from "./caged.js";
import { FILL_LAYERS, windowCopies } from "./neck.jsx";
import { pathScale, scalePaths, scale3nps } from "./paths.js";

export const PATH_DEFAULTS = { pl: "runs", pid: null, pstep: 0, psort: "lo", pdesc: false, pstr: "all", poct: 1, pstart: "root", pspan: "any", pview: "rows" };
const FILTER_KEYS = ["pstr", "poct", "pstart", "pspan"];
const STR_OPTS = { 1: [["all", "All"], [1, "1"], [2, "2"], [3, "3"]], 2: [["all", "All"], [5, "5"], [6, "6"]] };
export const pathStrOk = (oct, v) => STR_OPTS[oct].some(([k]) => k === v);
const PAGE = { rows: 120, cards: 24 };
const COUNT = ["", "One string", "Two strings", "Three strings"];

// A cell's fill: its window colour, split half and half where two windows hold it (mock-up call 3).
export const winFill = (ws) => (ws.length > 1 ? `linear-gradient(135deg, ${POS_COLOR[ws[0].letter]} 0 50%, ${POS_COLOR[ws[1].letter]} 50% 100%)` : ws.length ? POS_COLOR[ws[0].letter] : THEME.ctl);

// The scale the list and the panel read: names and degrees as the neck spells them.
export function listScale(cfg) {
  const sc = pathScale(cfg);
  const at = atScale(cfg.keyRoot, cfg.keyMode, cfg.scope, cfg.mode, cfg.keySpell);
  const title = cfg.scope === "scale" ? `${at.rootName} ${MODE_NAME[cfg.mode]}` : cfg.scope === "blended" ? `${at.rootName} major and minor pentatonic` : `${at.rootName} ${cfg.keyMode} ${cfg.scope}`;
  return { sc, at, title };
}

// A row: a path, a window or All, with its columns.
function decorate(tuning, root, posList, item, at) {
  const order = (s) => tuning.openAbs[s];
  const strsLow = item.strs;
  const c0 = item.cells[0];
  const wins = item.win ? [item.win] : coverWins(root, posList, item.cells);
  const kindOrd = item.all ? -1 : item.win ? 0 : item.kind === "3nps" ? 1 : item.oct === 2 ? 3 : 2;
  const name = item.all ? "All positions" : item.win ? `Position ${item.win.num} ${item.win.letter}` : item.kind === "3nps" ? "3 per string" : item.oct === 2 ? "Two octaves" : COUNT[strsLow.length];
  return {
    ...item, wins, kindOrd, name,
    strsTxt: strsLow.length === tuning.strings ? `All ${tuning.strings}` : strsLow.map((s) => tuning.labels[s]).join(" "),
    nps: item.counts.join("-"),
    fretsTxt: item.lo === item.hi ? String(item.lo) : `${item.lo}–${item.hi}`,
    startTxt: c0 ? `${tuning.labels[c0.s]} · ${at.deg(c0.iv)}` : "",
    startKey: c0 ? [order(c0.s), c0.iv] : [0, 0],
    src: item.all || item.win ? "CAGED window" : item.csv ? `Yours · ${item.csv}` : "Generated",
    srcOrd: item.all || item.win ? 0 : item.csv ? 1 : 2,
  };
}

const SORTS = {
  path: (r) => [r.kindOrd, r.strs.length],
  strs: (r) => [r.strs.length, r.lowOrd],
  nps: (r) => [r.nps],
  lo: (r) => [r.lo, r.hi],
  span: (r) => [r.span, r.lo],
  start: (r) => r.startKey,
  pos: (r) => [r.wins.length ? r.wins[0].num : 0, r.wins.length],
  src: (r) => [r.srcOrd],
};
const COLS = [["path", "Path"], ["strs", "Strings"], ["nps", "Per string"], ["lo", "Frets"], ["span", "Span"], ["start", "Starts"], ["pos", "Position"], ["src", "Source"]];
const cmpKey = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; };

// Every row the Scale tab can list for this state, and the chosen one. The chosen path is found among all of the scale's
// paths, so a filter that hides its row leaves it on the neck.
// range (Build C): the fret range; rows keep only what fits inside it (a window, its copies that do).
export function usePathRows(tuning, cfg, at, range) {
  const { lo: rlo, hi: rhi } = range;
  const { keyRoot: root, keyMode, scope, mode } = cfg;
  const { sc, at: names, title } = useMemo(() => listScale(cfg), [root, keyMode, scope, mode, cfg.keySpell]);
  const posList = keyMode === "major" ? POS_MAJOR : POS_MINOR;
  const oct = at.poct, start = at.pstart;
  const strF = pathStrOk(oct, at.pstr) ? at.pstr : "all";
  // The layer's own set (Major and minor has no paths, but its windows are listed), as the neck reads it.
  const layerSet = useMemo(() => new Set(scopeIntervals(keyMode, scope, "triad", mode)), [keyMode, scope, mode]);
  const lowOrd = (r) => { const order = [...Array(tuning.strings).keys()].sort((a, b) => tuning.openAbs[a] - tuning.openAbs[b]); return order.indexOf(r.strs[0]); };
  const runs = useMemo(() => {
    if (!sc) return [];
    return scalePaths(tuning, root, sc, oct, start).filter((p) => inRange(range, p.cells)).map((p) => { const r = decorate(tuning, root, posList, p, names); r.lowOrd = lowOrd(r); return r; });
  }, [tuning, root, sc, oct, start, posList, names, rlo, rhi]);
  const positions = useMemo(() => {
    const wins = posList.map((p) => {
      // The window's copies on the neck (its lowest and the one 12 up where it ends by the last fret) that fit the range; the
      // row's notes are the lowest of them.
      const base = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
      const fits = windowCopies(tuning, root, layerSet, p, FILL_LAYERS.includes(scope)).filter((c) => inRange(range, c.cells));
      if (!fits.length) return null;
      const cells = fits[0].cells;
      const strs = [], counts = [];
      [...Array(tuning.strings).keys()].sort((a, b) => tuning.openAbs[a] - tuning.openAbs[b]).forEach((s) => {
        const k = cells.filter((c) => c.s === s).length;
        if (k) { strs.push(s); counts.push(k); }
      });
      const fs = cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
      const copies = fits.map((c) => base + c.k);
      const r = decorate(tuning, root, posList, { id: "w" + p.num, win: p, cells, strs, counts, lo, hi, span: hi - lo, copies }, names);
      r.fretsTxt = fits.map((c) => { const f = c.cells.map((x) => x.f), a = Math.min(...f), z = Math.max(...f); return a === z ? String(a) : `${a}–${z}`; }).join(", ");
      r.lowOrd = 0;
      return r;
    }).filter(Boolean);
    const nps = sc ? scale3nps(tuning, root, sc).filter((p) => inRange(range, p.cells)).map((p) => { const r = decorate(tuning, root, posList, p, names); r.lowOrd = 0; return r; }) : [];
    return [...wins, ...nps];
  }, [tuning, root, sc, layerSet, scope, posList, names, rlo, rhi]);
  const allRow = useMemo(() => ({ id: "all", all: true, name: "All positions", cells: [], strs: [], counts: [], wins: posList, kindOrd: -1, nps: "", strsTxt: `All ${tuning.strings}`, fretsTxt: `${rlo}–${rhi}`, startTxt: "", src: "CAGED windows", lo: rlo, hi: rhi, span: rhi - rlo }), [posList, tuning, rlo, rhi]);

  // The chosen path: looked up by id among all the scale's paths (any start; its octave count from its note count). One
  // outside the fret range is not chosen (Build C); the Scale tab then drops it.
  const chosen0 = useMemo(() => {
    if (!at.pid || !sc) return null;
    const m = /^(\d+)-(\d+)-(\d+)$/.exec(at.pid);
    if (!m) return null;
    const n = [...m[3]].reduce((a, d) => a + +d, 0);
    if (n === 3 * tuning.strings && sc.seven) { const r = positions.find((x) => x.id === at.pid); if (r) return r; }
    const o = (n - 1) / sc.ivs.length;
    if (o !== 1 && o !== 2) return null;
    const listed = o === oct ? runs.find((x) => x.id === at.pid) : null;
    if (listed) return listed;
    const p = scalePaths(tuning, root, sc, o, "any").find((x) => x.id === at.pid);
    if (!p) return null;
    const r = decorate(tuning, root, posList, p, names); r.lowOrd = lowOrd(r); return r;
  }, [at.pid, sc, runs, positions, tuning, root, oct, start, posList, names]);
  const chosen = chosen0 && inRange(range, chosen0.cells) ? chosen0 : null;
  const winRow = typeof cfg.pos === "number" ? positions.find((r) => r.win && r.win.num === cfg.pos) || null : cfg.pos === "all" ? allRow : null;
  const current = chosen || winRow;

  const list = at.pl === "pos" ? positions : runs.filter((r) => (strF === "all" || r.strs.length === strF) && (at.pspan === "any" || r.span <= 5));
  const sorted = useMemo(() => {
    const k = SORTS[at.psort] || SORTS.lo, d = at.pdesc ? -1 : 1;
    const out = list.slice().sort((a, b) => (cmpKey(k(a), k(b)) || a.lo - b.lo || a.hi - b.hi || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) * d);
    return at.pl === "pos" ? [allRow, ...out] : out;
  }, [list, at.psort, at.pdesc, at.pl, allRow]);
  return { sc, names, title, posList, rows: sorted, runsCount: list.length, chosen, current, strF, wins: positions.filter((r) => r.win).length, nps: positions.filter((r) => !r.win).length };
}

// The steps of the current item: a path's notes, or the lowest copy of a window (gap fill included), low to high.
export const stepsOf = (item) => (item && !item.all ? item.cells : []);

// The panel under the neck (mock-up call 4): what is on the neck, ▲ ▼ through the list, Whole neck, and ‹ › through its notes.
export function PathPanel({ tuning, data, at, setAt, onPick, onWhole, labelMode }) {
  const { current, rows, names, posList, title } = data;
  const steps = stepsOf(current);
  const step = Math.min(at.pstep, Math.max(0, steps.length - 1));
  const idx = current ? rows.findIndex((r) => r.id === current.id) : -1;
  const go = (d) => { if (!rows.length) return; const i = idx < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, idx + d)); onPick(rows[i]); };
  const setStep = (i) => setAt((a) => ({ ...a, pstep: i }));
  const cur = steps[step] || null;
  const strNo = (s) => s + 1;
  const sub = current ? (current.all ? "the five windows together, coloured by window"
    : [`frets ${current.fretsTxt}`, current.strsTxt, current.wins.map((w) => `${w.num} ${w.letter}`).join(" + "), current.src].filter(Boolean).join(" · ")) : `${title} · whole neck · tap a row, or ▼ for the first`;
  return (
    <div className="ppanel" data-ppanel>
      <div className="ppanel-top">
        <div className="ppanel-t">
          <h2 data-ptitle className="ptitle text-sm font-bold text-body" style={{ margin: 0 }}>{current ? current.name + (current.nps && !current.win ? " · " + current.nps : "") : "No path chosen"}</h2>
          <p data-psub className="psub text-xs text-muted" style={{ margin: 0 }}>{sub}</p>
        </div>
        <div className="ppanel-b">
          <Btn onClick={() => go(-1)} aria-label="Previous row" disabled={!rows.length}>▲</Btn>
          <Btn onClick={() => go(1)} aria-label="Next row" disabled={!rows.length}>▼</Btn>
          {current && <Btn onClick={onWhole}>Whole neck</Btn>}
        </div>
      </div>
      {steps.length > 0 && (
        <div className="psteps">
          <div className="pstep-row">
            <Btn onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous note">‹</Btn>
            <div className="pstep-chips" role="group" aria-label="Notes, low to high">
              {steps.map((c, i) => (
                <button key={i} data-step={i} aria-pressed={i === step} onClick={() => setStep(i)} className={"pchip" + (i === step ? " on" : "")} title={`${names.name((tuning.open[c.s] + c.f) % 12)} · string ${strNo(c.s)}, fret ${c.f}`}>
                  <span className="pchip-sw" style={{ background: current.win ? POS_COLOR[current.win.letter] : winFill(winsAt(names.root, posList, c.f)) }} />
                  <b>{names.deg(c.iv)}</b><span>{names.name((tuning.open[c.s] + c.f) % 12)}</span><span className="text-muted">{strNo(c.s)}·{c.f}</span>
                </button>
              ))}
            </div>
            <Btn onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step >= steps.length - 1} aria-label="Next note">›</Btn>
          </div>
          <p data-steptxt aria-live="polite" className="psteptxt text-xs text-muted" style={{ margin: "4px 0 0" }}>Step {step + 1} of {steps.length} · {cur ? `${names.name((tuning.open[cur.s] + cur.f) % 12)} · string ${strNo(cur.s)}, fret ${cur.f}` : ""} · ‹ › step through the notes · ▲ ▼ change row</p>
        </div>
      )}
    </div>
  );
}

// A row's small neck (Cards): its notes in their window colours, the root framed, in a frame of 6 frets or more.
function PathNeck({ tuning, row, names, posList, labelMode }) {
  const cells = row.cells, fs = cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
  const span = hi - lo + 1, cols = Math.max(6, span);
  const start = Math.max(0, Math.min(tuning.frets - cols + 1, lo - Math.floor((cols - span) / 2)));
  const hit = {};
  cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const out = [];
  for (let s = 0; s < tuning.strings; s++) {
    out.push(<span key={"l" + s} className="mn-c" style={{ height: 26, fontSize: 11, fontWeight: 600, color: THEME.text }}>{tuning.labels[s]}</span>);
    for (let f = start; f < start + cols; f++) {
      const c = hit[s * 100 + f];
      let dot = null;
      if (c) {
        const pc = (tuning.open[s] + f) % 12, isRoot = c.iv === 0;
        const bg = row.win ? POS_COLOR[row.win.letter] : winFill(winsAt(names.root, posList, f));
        const lab = labelMode === "name" ? names.name(pc) : labelMode === "degree" ? names.deg(c.iv) : "";
        dot = <span data-c={`${s}-${f}`} data-gap={c.gap ? "1" : undefined} data-root={isRoot ? "1" : undefined} className={"mn-d fdot " + (isRoot ? ROOT : TILE)} style={{ width: 20, height: 20, background: bg, color: THEME.ink, fontSize: 11, fontWeight: isRoot ? 800 : 600, zIndex: isRoot ? 5 : 2 }}>{lab}</span>;
      }
      out.push(
        <span key={s + "-" + f} className="mn-c" style={{ height: 26, borderRight: f === 0 ? `4px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, background: f === 0 ? THEME.track : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: 8, height: 8 }} />}
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

const WinTags = ({ wins }) => wins.map((w) => <span key={w.num} className="atag ptag" style={{ boxShadow: `inset 0 -3px 0 ${POS_COLOR[w.letter]}` }}>{w.num} {w.letter}</span>);

// The list under the Scale neck.
export function PathList({ tuning, cfg, data, at, setAt, onPick, labelMode, range }) {
  const { sc, rows, current, title, strF, names, posList } = data;
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  const view = at.pview, runsTab = at.pl !== "pos";
  const [shown, setShown] = useState(PAGE[view]);
  // A new list starts at its first page; the chosen row is always shown.
  const listKey = [cfg.keyRoot, cfg.keyMode, cfg.scope, cfg.mode, at.pl, at.poct, at.pstart, strF, at.pspan, at.psort, at.pdesc, view, range.key].join("|");
  useEffect(() => { setShown(PAGE[view]); }, [listKey]);
  const ci = current ? rows.findIndex((r) => r.id === current.id) : -1;
  const limit = Math.max(shown, ci + 1);
  const filtered = FILTER_KEYS.some((k) => (k === "pstr" ? strF : at[k]) !== PATH_DEFAULTS[k]);
  const clear = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, PATH_DEFAULTS[k]])));
  const count = runsTab ? `${rows.length} ${rows.length === 1 ? "path" : "paths"}` : `${data.wins} windows${data.nps ? ` · ${data.nps} patterns` : ""}`;
  const isOn = (r) => current !== null && r.id === current.id;
  const head = (k, l) => {
    const on = at.psort === k;
    return (
      <th key={k} scope="col" aria-sort={on ? (at.pdesc ? "descending" : "ascending") : "none"}>
        <button data-sort={k} onClick={() => set(on ? { pdesc: !at.pdesc } : { psort: k, pdesc: false })} className={"psort" + (on ? " on" : "")}>{l}{on ? (at.pdesc ? " ▼" : " ▲") : ""}</button>
      </th>
    );
  };
  const none = runsTab && !sc;
  return (
    <section aria-label="Paths" className="plist">
      <div className="plist-h">
        <h2 className="text-sm font-bold text-body" style={{ margin: 0 }}>Paths · {title}</h2>
        <Track label="List" cols={2}>{[["runs", "Runs"], ["pos", "Positions"]].map(([k, l]) => <Seg key={k} active={(k === "pos") === !runsTab} onClick={() => set({ pl: k })}>{l}</Seg>)}</Track>
        <span data-pcount aria-live="polite" className="text-xs text-muted">{none ? "" : count}</span>
        <span className="labs"><span className="text-xs text-muted">Show as</span>
          <Track label="Show as" cols={2}>{[["rows", "Rows"], ["cards", "Cards"]].map(([k, l]) => <Seg key={k} active={view === k} onClick={() => set({ pview: k })}>{l}</Seg>)}</Track>
        </span>
      </div>
      {runsTab && sc && (
        <Bar label="Path filters">
          <Grp cap="Strings"><Track label="Strings" cols={STR_OPTS[at.poct].length}>{STR_OPTS[at.poct].map(([k, l]) => <Seg key={k} active={strF === k} onClick={() => set({ pstr: k })}>{l}</Seg>)}</Track></Grp>
          <Grp cap="Octaves"><Track label="Octaves" cols={2}>{[[1, "1"], [2, "2"]].map(([k, l]) => <Seg key={k} active={at.poct === k} onClick={() => set({ poct: k, pstr: pathStrOk(k, at.pstr) ? at.pstr : "all" })}>{l}</Seg>)}</Track></Grp>
          <Grp cap="Starts on"><Track label="Starts on" cols={2}>{[["root", "Root"], ["any", "Any note"]].map(([k, l]) => <Seg key={k} active={at.pstart === k} onClick={() => set({ pstart: k })}>{l}</Seg>)}</Track></Grp>
          <Grp cap="Span"><Track label="Span" cols={2}>{[["any", "Any"], ["5", "≤ 5 frets"]].map(([k, l]) => <Seg key={k} active={at.pspan === k} onClick={() => set({ pspan: k })}>{l}</Seg>)}</Track></Grp>
          {filtered && <ClearAll onClick={clear} />}
        </Bar>
      )}
      {none && <p data-nopaths className="text-sm text-muted" style={{ margin: "8px 0 0" }}>Paths cover every scale but Major and minor. Its five windows are under Positions.</p>}
      {!runsTab && <p className="text-xs text-muted" style={{ margin: "8px 0" }}>The five CAGED windows as Position showed them (every copy, gap fill included), All, {sc && sc.seven ? "and the 3-notes-per-string patterns, every copy." : "and 3 per string for the 7-note scales (not this one)."}</p>}
      {!none && (view === "rows" ? (
        <div className="ptable-w">
          <table className="ptable" aria-label={`${runsTab ? "Runs" : "Positions"}, ${title}`}>
            <thead><tr>{COLS.map(([k, l]) => head(k, l))}</tr></thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.id} data-row={r.id} aria-selected={isOn(r)} className={isOn(r) ? "on" : undefined} onClick={() => onPick(r)}>
                  <td><button className="prow" aria-pressed={isOn(r)} onClick={(e) => { e.stopPropagation(); onPick(r); }}>{r.name}</button></td>
                  <td>{r.strsTxt}</td><td>{r.nps}</td><td>{r.fretsTxt}</td><td>{r.all ? "" : r.span}</td><td>{r.startTxt}</td>
                  <td><span className="ptags"><WinTags wins={r.wins} /></span></td>
                  <td className={r.csv ? "pyours" : "text-muted"}>{r.src}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="acards pcards">
          {rows.slice(0, limit).map((r) => (
            <div key={r.id} data-card={r.id} data-lit={isOn(r) ? "1" : undefined} className={"acard" + (isOn(r) ? " lit" : "")} onClick={() => onPick(r)}>
              <button className="acard-hit" aria-pressed={isOn(r)} aria-label={`${r.name}${r.nps ? ", " + r.nps : ""}, frets ${r.fretsTxt}`} onClick={(e) => { e.stopPropagation(); onPick(r); }}>
                <span className="acard-top"><span data-title style={{ fontSize: 14, fontWeight: 700, color: THEME.text, whiteSpace: "nowrap" }}>{r.name}{r.nps && !r.win ? " · " + r.nps : ""}</span><span className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>frets {r.fretsTxt}</span></span>
                {r.all ? <span className="text-xs text-muted">All five windows on the neck at once, coloured by window.</span> : <PathNeck tuning={tuning} row={r} names={names} posList={posList} labelMode={labelMode} />}
              </button>
              <div className="acard-foot"><WinTags wins={r.wins} /><span className={"atag" + (r.csv ? " pyours" : "")} style={{ marginLeft: "auto" }}>{r.src}</span></div>
            </div>
          ))}
        </div>
      ))}
      {!none && !rows.length && !range.full && <p data-pempty className="text-sm text-muted" style={{ margin: "8px 0 0" }}>No {runsTab ? "run" : "window or pattern"} fits {filtered && runsTab ? "these filters and " : ""}frets {range.label}.</p>}
      {!none && rows.length > limit && (
        <p style={{ margin: "10px 0 0" }}><Btn onClick={() => setShown(limit + PAGE[view])}>Show {Math.min(PAGE[view], rows.length - limit)} more ({rows.length - limit} left)</Btn></p>
      )}
    </section>
  );
}
