// Fretboard Trainer · Chord → Voicing (Build C, E9 model; mock-up of 25 Nov): one voicing on the neck, the panel under it
// (what is on the neck, ▲ ▼, the chord's tones) and the list of every voicing of the chord under that: Rows | Cards (cards
// by default, TC 25 Nov), sortable columns, the filters Type, Strings and Inversion. The bar's Frets range keeps the voicings
// that fit inside it, every copy (TC 25 Nov); Lay out by, Open strings, Max span, Card size and the type definitions went
// (TC 25 Nov: as mocked). Shapes come from chordshapes.js; the tuning is an input.
import { useState, useMemo, useEffect } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { Seg, Track, Btn, Bar, Grp, Labels, ClearAll, useMedia, PHONE_Q, CHORD_LABELS } from "../../core/ui.jsx";
import { MARKERS, inlayAt, neckOf, neckCols, inRange, FULL_RANGE } from "./guitar.js";
import { POS_COLOR, formFill, formName } from "./caged.js";
import { TILE, ROOT } from "../../core/marker.js";
import { chordQ } from "./url.js";
import { FretsGrp, SizeGrp } from "./neck.jsx";
import { CH_TYPES, CH_TYPE_KEYS, INV_LABEL, chAvail, chIvs, chName, chordCards, strLabel, openRows } from "./chordshapes.js";

// The list's filters and their defaults, so Clear all and Identify's link agree. Type: All or one voicing type.
export const CH_FILTER_DEFAULT = { ctype: "all", cinv: null, cset: null };
const FILTER_KEYS = Object.keys(CH_FILTER_DEFAULT);
const INV_SEG = [[null, "All"], [0, "Root"], [1, "1st"], [2, "2nd"], [3, "3rd"]];
// Rows or cards shown before Show more (Build B's rule, every width).
const PAGE = { rows: 120, cards: 24 };
// The Type column's names (the voicing types, one voicing each).
const KIND_NAME = { caged: "CAGED form", open: "Open position", triad: "Closed triad", drop2: "Drop 2", drop3: "Drop 3", shell: "Shell" };
const KIND_ORD = Object.fromEntries(CH_TYPE_KEYS.map((k, i) => [k, i]));
const FORM_ORD = { C: 1, A: 2, G: 3, E: 4, D: 5 };

// A chord card's neck: six fret columns (more if the shape spans more), as the scale cards. Every shape in its CAGED form's
// colour; the root with its ink frame (Build A). mutes (Build C, the voicing list): × in place of a string's name where the
// shape leaves the string out, as at the big neck's nut.
export function ChordNeck({ tuning, card, labelMode, lg, mutes = false }) {
  const { cells, start, cols } = card;
  const rowH = lg ? 34 : 28, d1 = lg ? 26 : 22, fs = lg ? 12 : 11;
  // Every shape in its CAGED form colour (Round 15), split where two forms hold it, neutral where none does.
  const col = formFill(card.forms);
  const hit = {};
  cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const out = [];
  for (let s = 0; s < tuning.strings; s++) {
    const muted = mutes && card.frets[s] === null;
    out.push(<span key={"l" + s} data-mute={muted ? s : undefined} className="mn-c" style={{ height: rowH, fontSize: 11, fontWeight: muted ? 700 : 600, color: muted ? THEME.muted : THEME.text }}>{muted ? "×" : tuning.labels[s]}</span>);
    for (let f = start; f < start + cols; f++) {
      const c = hit[s * 100 + f];
      let dot = null;
      if (c) {
        const pc = (tuning.open[s] + f) % 12, isRoot = c.iv === 0;
        const lab = labelMode === "name" ? card.name(pc) : labelMode === "degree" ? card.deg(c.iv) : "";
        const data = { "data-c": `${s}-${f}`, title: `${card.name(pc)} · ${card.deg(c.iv)}` };
        dot = isRoot
          ? <span {...data} data-root="1" className={"mn-d fdot " + ROOT} style={{ width: d1, height: d1, background: col, color: THEME.ink, fontSize: fs, fontWeight: 800, zIndex: 5 }}>{lab}</span>
          : <span {...data} className="mn-d fdot" style={{ width: d1, height: d1, background: col, color: THEME.ink, fontSize: fs, fontWeight: 800, zIndex: 3 }}>{lab}</span>;
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
// A card's head line (Round 15): the shape's tones, low string to high, as degrees or (Labels: Notes) note names.
export function tonesOf(card, labelMode) {
  const low = [...card.cells].sort((a, b) => b.s - a.s);
  return low.map((c) => (labelMode === "name" ? card.name((card.root + c.iv) % 12) : card.deg(c.iv))).join(" ");
}
// The form tag's underline in its colour, split where two forms hold the shape.
export const formLine = (fs) => (fs.length > 1 ? `linear-gradient(90deg, ${POS_COLOR[fs[0]]} 0 50%, ${POS_COLOR[fs[1]]} 50% 100%)` : `linear-gradient(${POS_COLOR[fs[0]]}, ${POS_COLOR[fs[0]]})`);
// Six fret columns or more, the shape centred with the spare column above it (the Scales cards' rule).
export function frame(tuning, cells) {
  const fs = cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
  const span = hi - lo + 1, cols = Math.max(6, span);
  return { cols, start: Math.max(0, Math.min(tuning.frets - cols + 1, lo - Math.floor((cols - span) / 2))) };
}

// Every voicing of the chord that fits the fret range: each shape of every voicing type the quality has, its lowest copy and
// its copy 12 frets up (TC, 25 Nov: every copy inside the range is a row, as on Scale), with the list's columns.
export function voicingRows(tuning, root, q, range) {
  return chordCards(tuning, root, q, CH_TYPE_KEYS, true).filter((c) => inRange(range, c.cells)).map((c) => {
    const ss = c.cells.map((x) => x.s + 1);
    const no5 = c.tags.includes("No 5th");
    return {
      ...c, ...frame(tuning, c.cells),
      // The name without the card's " · 12 up": the Frets column tells the copies apart.
      nameTxt: c.title.replace(/ · 12 up$/, ""), typeName: KIND_NAME[c.kind], invName: INV_LABEL[c.inv], strTxt: strLabel(c.tok),
      top: Math.min(...ss), bot: Math.max(...ss), formTxt: formName(c.forms), no5,
    };
  });
}

const SORTS = {
  kind: (c) => [KIND_ORD[c.kind]],
  name: (c) => [c.nameTxt],
  inv: (c) => [c.inv],
  strs: (c) => [c.top, c.bot],
  lo: (c) => [c.lo, c.hi],
  span: (c) => [c.span, c.lo],
  form: (c) => [c.forms.length ? FORM_ORD[c.forms[0]] : 9, c.forms.length],
};
const COLS = [["kind", "Type"], ["name", "Name"], ["inv", "Inversion"], ["strs", "Strings"], ["lo", "Frets"], ["span", "Span"], ["form", "CAGED form"]];
const cmpKey = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; };
// Ties: low fret to high, then type, the lower bass string, inversion, the lowest copy first.
const tie = (a, b) => a.lo - b.lo || a.hi - b.hi || KIND_ORD[a.kind] - KIND_ORD[b.kind] || b.bassStr - a.bassStr || a.inv - b.inv || a.k - b.k || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export const sortVoicings = (rows, key, desc) => { const k = SORTS[key] || SORTS.lo, d = desc ? -1 : 1; return rows.slice().sort((a, b) => (cmpKey(k(a), k(b)) || tie(a, b)) * d); };

// The voicing on the big neck (Build A, TC 25 Nov): its notes filled in its CAGED form colour, the root framed, the chord's
// other tones across the neck as open squares, and × at the nut on each string the shape leaves out (mock-up call 6); with
// the nut outside the fret range (Build C), the × sits by the string's name. The neck scrolls to the shape when it is wider
// than the screen. Frets and Neck size (Build C) as on the other necks.
function VoicingNeck({ tuning, card, labelMode, range, size }) {
  const G = neckOf(size), { lo, hi } = range;
  const cellH = G.cellH, fontPx = G.font;
  const COLS = neckCols(tuning, G, lo, hi);
  const fill = formFill(card.forms), ivs = new Set(chIvs(card.q));
  const hit = {};
  card.cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const lab = (pc, iv) => (labelMode === "name" ? card.name(pc) : labelMode === "degree" ? card.deg(iv) : "");
  const scrollRef = React.useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const a0 = el.querySelector(`[data-fret="${Math.max(lo, card.lo - 1)}"]`), z0 = el.querySelector(`[data-fret="${Math.min(hi, card.hi + 1)}"]`);
    if (!a0 || !z0) return;
    const box = el.getBoundingClientRect(), l = a0.getBoundingClientRect().left - box.left + el.scrollLeft, r = z0.getBoundingClientRect().right - box.left + el.scrollLeft;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, (l + r) / 2 - el.clientWidth / 2), behavior: smooth ? "smooth" : "auto" });
  }, [tuning, card.id, card.root, card.q, lo, hi, size]);
  const rows = [];
  for (let s = 0; s < tuning.strings; s++) {
    const muted = card.frets[s] === null;
    rows.push(<div key={"l" + s} className="flex items-center justify-center text-xs font-semibold" style={{ height: cellH, color: muted ? THEME.muted : THEME.text }}>{tuning.labels[s]}{muted && lo > 0 && <span data-mute={s} aria-label="muted" style={{ marginLeft: 2, fontWeight: 700 }}>×</span>}</div>);
    for (let f = lo; f <= hi; f++) {
      const pc = (tuning.open[s] + f) % 12, iv = (((pc - card.root) % 12) + 12) % 12, c = hit[s * 100 + f];
      let dot = null;
      if (c) {
        const isRoot = c.iv === 0, title = `${card.name(pc)} · ${card.deg(c.iv)}`;
        dot = <div data-v={`${s}-${f}`} data-root={isRoot ? "1" : undefined} title={title} className={"fdot " + (isRoot ? ROOT : TILE) + " relative flex items-center justify-center"} style={{ width: G.tile, height: G.tile, background: fill, color: THEME.ink, fontSize: fontPx, fontWeight: 800, zIndex: isRoot ? 5 : 3 }}>{lab(pc, c.iv)}</div>;
      } else if (f === 0 && muted) {
        dot = <div data-mute={s} aria-label="muted" className="relative" style={{ color: THEME.muted, fontSize: G.mute, fontWeight: 700, zIndex: 2 }}>×</div>;
      } else if (ivs.has(iv)) {
        dot = <div data-o={`${s}-${f}`} title={`${card.name(pc)} · ${card.deg(iv)}`} className={TILE + " relative flex items-center justify-center"} style={{ width: G.small, height: G.small, border: `${iv === 0 ? 3 : 1.5}px solid ${THEME.edge}`, color: THEME.muted, fontSize: fontPx, fontWeight: 500, zIndex: 2 }}>{lab(pc, iv)}</div>;
      }
      rows.push(
        <div key={s + "-" + f} data-fret={s === 0 ? f : undefined} className="relative flex items-center justify-center" style={{ height: cellH, borderRight: f === 0 ? `5px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, borderLeft: f === lo && lo > 0 ? `2px solid ${THEME.fret}` : undefined, background: f === 0 ? THEME.track : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: G.inlay, height: G.inlay }} />}
          <div className="absolute left-0 right-0" style={{ top: "50%", transform: "translateY(-50%)", height: tuning.gauges[s], background: THEME.edge }} />
          {dot}
        </div>
      );
    }
  }
  return (
    <div ref={scrollRef} data-voicing={card.id} className="overflow-x-auto pb-2 rounded-xl" style={{ background: THEME.panel2 }}>
      <div className="grid p-3" style={{ gridTemplateColumns: COLS, width: "100%", minWidth: "min-content" }}>
        {rows}
        <div />
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((f) => (
          <div key={"n" + f} className="flex items-center justify-center text-xs" style={{ height: 24, color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</div>
        ))}
      </div>
    </div>
  );
}

// The form's swatch: its colour, split where two forms hold the shape.
const Swatch = ({ forms }) => <span className="vsw" aria-hidden="true" style={{ background: formFill(forms) }} />;

// The panel under the neck (mock-up): the voicing on the neck, ▲ ▼ through the list, All positions on the chord at the
// voicing's window (the card link before Build C), and the chord's tones; a tone the voicing leaves out is open.
function VoicingPanel({ card, rows, onPick, onAll }) {
  const idx = rows.findIndex((r) => r.id === card.id);
  const go = (d) => { if (!rows.length) return; const i = idx < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, idx + d)); onPick(rows[i]); };
  const has = new Set(card.cells.map((c) => c.iv));
  const sub = [card.typeName, card.invName, `strings ${card.strTxt}`, card.sub, card.formTxt].filter(Boolean).join(" · ");
  return (
    <div className="ppanel" data-vpanel>
      <div className="ppanel-top">
        <div className="ppanel-t">
          <h2 data-vtitle className="ptitle text-sm font-bold text-body" style={{ margin: 0 }}>{card.nameTxt}{card.no5 ? " · no 5th" : ""}</h2>
          <p data-vsub aria-live="polite" className="psub text-xs text-muted" style={{ margin: 0 }}>{sub}</p>
        </div>
        <div className="ppanel-b">
          <Btn onClick={() => go(-1)} aria-label="Previous voicing" disabled={!rows.length}>▲</Btn>
          <Btn onClick={() => go(1)} aria-label="Next voicing" disabled={!rows.length}>▼</Btn>
          <Btn data-open={card.id} onClick={() => onAll(card)}>All positions</Btn>
        </div>
      </div>
      <div className="vtones" role="list" aria-label="Chord tones">
        {chIvs(card.q).map((iv) => {
          const on = has.has(iv);
          return (
            <span key={iv} role="listitem" data-tone={iv} className={"vtone" + (on ? "" : " off")} title={on ? undefined : "Not in this voicing"}>
              <b>{card.deg(iv)}</b><span>{card.name((card.root + iv) % 12)}</span>{!on && <span className="sr-only">, not in this voicing</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// lead: the Chord tab's Show, Root and Quality (Build A). The chord is the Chord tab's one chord (TC, 25 Nov).
export function VoicingView({ tuning, cfg, at, setAt, globals, onAll, lead }) {
  const croot = cfg.root, cq = chordQ(cfg);
  const { labelMode, setLabelMode, range, neckSize } = globals;
  const { cset, clit, cview: view, csort, cdesc } = at;
  const phone = useMedia(PHONE_Q);
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  const avail = chAvail(cq), n3 = chIvs(cq).length === 3;
  // A type the quality does not have (after a Quality change) goes back to All; a 3-note chord has no 3rd inversion.
  const ctype = at.ctype !== "all" && !avail.includes(at.ctype) ? "all" : at.ctype;
  const cinv = at.cinv === 3 && n3 ? null : at.cinv;
  useEffect(() => { if (ctype !== at.ctype || cinv !== at.cinv) set({ ctype, cinv }); });
  const boardRef = React.useRef(null);

  const base = useMemo(() => voicingRows(tuning, croot, cq, range), [tuning, croot, cq, range.key]);
  const byType = useMemo(() => base.filter((c) => (ctype === "all" || c.kind === ctype) && (cinv === null || c.inv === cinv)), [base, ctype, cinv]);
  const rows = useMemo(() => sortVoicings(byType.filter((c) => cset === null || c.tok === cset), csort, cdesc), [byType, cset, csort, cdesc]);
  // Strings on offer: the string sets of the chosen type and inversion, plus the chosen one.
  const setOpts = useMemo(() => {
    const toks = [...new Set(byType.map((c) => c.tok).concat(cset ? [cset] : []))];
    return toks.sort((a, b) => +a[0] - +b[0] || a.length - b.length || +a[a.length - 1] - +b[b.length - 1]);
  }, [byType, cset]);
  // The voicing on the neck: the chosen one if the list holds it, else the first row.
  const onNeck = rows.find((c) => c.id === clit) || rows[0] || null;

  // Paging (Build B's rule): a new list starts at its first page; the chosen row is always shown.
  const [shown, setShown] = useState(PAGE[view]);
  const listKey = [croot, cq, ctype, cinv, cset, csort, cdesc, view, range.key].join("|");
  useEffect(() => { setShown(PAGE[view]); }, [listKey]);
  const ci = onNeck ? rows.findIndex((r) => r.id === onNeck.id) : -1;
  const limit = Math.max(shown, ci + 1);

  // A row tap puts it on the neck; when the neck is off screen it comes into view (Build B call 9).
  const pick = (c, scroll = false) => {
    set({ clit: c.id });
    const el = boardRef.current;
    if (!scroll || !el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const nm = chName(croot, cq);
  const filtered = ctype !== "all" || cinv !== null || cset !== null;
  const clear = () => set({ ...CH_FILTER_DEFAULT });
  const typeOpts = [["all", "All"], ...CH_TYPES.filter(([k]) => avail.includes(k)).map(([k, full, short]) => [k, phone ? short : full])];
  const invOpts = INV_SEG.filter(([v]) => !(v === 3 && n3));
  const isOn = (c) => onNeck !== null && c.id === onNeck.id;
  const head = (k, l) => {
    const on = csort === k;
    return (
      <th key={k} scope="col" aria-sort={on ? (cdesc ? "descending" : "ascending") : "none"}>
        <button data-sort={k} onClick={() => set(on ? { cdesc: !cdesc } : { csort: k, cdesc: false })} className={"psort" + (on ? " on" : "")}>{l}{on ? (cdesc ? " ▼" : " ▲") : ""}</button>
      </th>
    );
  };
  const sortName = COLS.find(([k]) => k === csort)[1];

  // Empty state: why nothing matches, a Remove for each filter and, under a narrower fret range, the whole neck.
  const removes = [
    ctype !== "all" && [`Type: ${CH_TYPES.find(([k]) => k === ctype)[1]}`, () => set({ ctype: "all" })],
    cset !== null && [`Strings ${strLabel(cset)}`, () => set({ cset: null })],
    cinv !== null && [`Inversion: ${INV_SEG.find(([v]) => v === cinv)[1]}`, () => set({ cinv: null })],
  ].filter(Boolean);
  const why = ctype === "open" && !openRows(tuning, croot, cq).length ? `The open-position list has no ${nm} voicing.`
    : cinv !== null && cinv > 0 && (ctype === "caged" || ctype === "shell")
      ? <React.Fragment>{ctype === "shell" ? "Shells always have" : "CAGED forms always have"} the root in the bass, so <b className="text-body" style={{ fontWeight: 600 }}>Inversion: {INV_SEG.find(([v]) => v === cinv)[1]}</b> leaves none.</React.Fragment>
      : !filtered ? `No ${nm} voicing fits frets ${range.label}.`
        : `The filters leave none${range.full ? "" : ` inside frets ${range.label}`}.`;

  return (
    <div>
      <Bar>
        {lead}
        <FretsGrp globals={globals} />
        <SizeGrp globals={globals} />
      </Bar>
      <div ref={boardRef} className="boardwrap">
        <div className="sumrow">
          <span data-summary className="text-sm font-semibold text-body">{onNeck ? nm : `${nm} · no voicing matches`}</span>
          <Labels value={labelMode} set={setLabelMode} opts={CHORD_LABELS} />
        </div>
        {onNeck && <VoicingNeck tuning={tuning} card={onNeck} labelMode={labelMode} range={range} size={neckSize} />}
        {onNeck && <VoicingPanel card={onNeck} rows={rows} onPick={(c) => pick(c)} onAll={onAll} />}
      </div>

      <section aria-label="Voicings" className="plist" data-vlist>
        <div className="plist-h">
          <h2 className="text-sm font-bold text-body" style={{ margin: 0 }}>Voicings · {nm}</h2>
          <span data-vcount aria-live="polite" className="text-xs text-muted">{rows.length} voicing{rows.length === 1 ? "" : "s"}</span>
          <span className="labs"><span className="text-xs text-muted">Show as</span>
            <Track label="Show as" cols={2}>{[["rows", "Rows"], ["cards", "Cards"]].map(([k, l]) => <Seg key={k} active={view === k} onClick={() => set({ cview: k })}>{l}</Seg>)}</Track>
          </span>
        </div>
        <Bar label="Voicing filters">
          <Grp cap="Type"><Track label="Type" cols={typeOpts.length}>{typeOpts.map(([k, l]) => <Seg key={k} active={ctype === k} onClick={() => set({ ctype: k, clit: null })}>{l}</Seg>)}</Track></Grp>
          <Grp cap="Strings">
            <Track label="Strings" cols={Math.min(phone ? 5 : 10, setOpts.length + 1)}>
              <Seg active={cset === null} onClick={() => set({ cset: null })}>All</Seg>
              {setOpts.map((t) => <Seg key={t} active={cset === t} onClick={() => set({ cset: t })}>{strLabel(t)}</Seg>)}
            </Track>
          </Grp>
          <Grp cap="Inversion"><Track label="Inversion" cols={invOpts.length}>{invOpts.map(([v, l]) => <Seg key={l} active={cinv === v} onClick={() => set({ cinv: v })}>{l}</Seg>)}</Track></Grp>
          {filtered && <ClearAll onClick={clear} />}
        </Bar>

        {rows.length === 0 ? (
          <div role="status" className="card" data-empty style={{ marginTop: 8, alignItems: "flex-start" }}>
            <h2 style={{ fontSize: 16 }}>No {nm} voicings match</h2>
            <p className="text-sm text-muted" style={{ margin: 0, lineHeight: 1.45, maxWidth: 560 }}>{why}</p>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {removes.map(([t, rm]) => <Btn key={t} onClick={rm}>Remove {t}</Btn>)}
              {!range.full && <Btn onClick={() => globals.setRange(FULL_RANGE)}>Frets 0–{tuning.frets}</Btn>}
            </div>
          </div>
        ) : view === "rows" ? (
          <div className="ptable-w">
            <table className="ptable" aria-label={`Voicings, ${nm}`}>
              <thead><tr>{COLS.map(([k, l]) => head(k, l))}</tr></thead>
              <tbody>
                {rows.slice(0, limit).map((c) => (
                  <tr key={c.id} data-row={c.id} aria-selected={isOn(c)} className={isOn(c) ? "on" : undefined} onClick={() => pick(c, true)}>
                    <td>{c.typeName}</td>
                    <td><button className="prow" aria-pressed={isOn(c)} onClick={(e) => { e.stopPropagation(); pick(c, true); }}>{c.nameTxt}</button>{c.no5 && <span className="atag vno5">No 5th</span>}</td>
                    <td>{c.invName}</td><td>{c.strTxt}</td><td className="vfrets">{c.sub}</td><td>{c.span}</td>
                    <td>{c.forms.length ? <span className="vform"><Swatch forms={c.forms} />{c.formTxt}</span> : <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <React.Fragment>
            <p data-cardsort className="text-xs text-muted" style={{ margin: "8px 0 0" }}>Cards follow the rows' sort ({sortName}, {cdesc ? "high to low" : "low to high"}). Switch to Rows to sort by any column.</p>
            <div className="acards pcards">
              {rows.slice(0, limit).map((c) => (
                <div key={c.id} data-card={c.id} data-lit={isOn(c) ? "1" : undefined} className={"acard" + (isOn(c) ? " lit" : "")} onClick={() => pick(c, true)}>
                  <button className="acard-hit" aria-pressed={isOn(c)} aria-label={`${c.nameTxt}, ${c.typeName}, ${c.invName}, strings ${c.strTxt}, frets ${c.sub}`} onClick={(e) => { e.stopPropagation(); pick(c, true); }}>
                    <span className="acard-top"><span data-title style={{ fontSize: 14, fontWeight: 700, color: THEME.text, whiteSpace: "nowrap" }}>{c.nameTxt}</span><span data-frets className="text-xs text-muted" style={{ whiteSpace: "nowrap", letterSpacing: ".5px" }}>{c.sub}</span></span>
                    <ChordNeck tuning={tuning} card={c} labelMode={labelMode} mutes />
                  </button>
                  <div className="acard-foot">
                    <span className="text-xs text-muted">{c.typeName} · {c.invName} · Strings {c.strTxt}</span>
                    {c.no5 && <span className="atag">No 5th</span>}
                    {c.forms.length > 0 && <span data-formtag className="atag vform" style={{ marginLeft: "auto", color: THEME.text, fontWeight: 600 }}><Swatch forms={c.forms} />{c.formTxt}</span>}
                  </div>
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
        {rows.length > limit && (
          <p style={{ margin: "10px 0 0" }}><Btn data-showmore onClick={() => setShown(limit + PAGE[view])}>Show {Math.min(PAGE[view], rows.length - limit)} more ({rows.length - limit} left)</Btn></p>
        )}
      </section>
    </div>
  );
}
