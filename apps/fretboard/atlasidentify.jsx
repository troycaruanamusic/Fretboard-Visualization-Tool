// Fretboard Trainer · the Atlas's Identify mode (build plan step 7, Identify mock-up of 19 Nov; TC's answers of 19 and 20 Nov):
// tap a shape on a 21-fret board, read its names, and see its shapes as Chords-mode cards. The matcher is identify.js.
import { useMemo, useEffect } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { Seg, Track, Btn, useMedia, PHONE_Q } from "../../core/ui.jsx";
import { CardGrid, AtlasCard } from "../../core/atlas.jsx";
import { ringMask } from "../../core/marker.js";
import { MARKERS, colPx, inlayAt } from "./guitar.js";
import { POS_COLOR, NEUTRAL_CT, formName } from "./caged.js";
import { CH_TYPES, CH_TYPE_KEYS, chAvail, chName, chordCards, chFilter, chSort, shapeCard } from "./chordshapes.js";
import { ChordNeck, tonesOf, formLine, frame, CH_FILTER_DEFAULT } from "./atlaschords.jsx";
import { PLAIN, shapeInfo, readings, oneOver } from "./identify.js";

// Undo (mock-up frames): the shapes before each tap, for this visit to the app; not in the link.
const HIST = [];
const LOWEST = 5;
const COARSE_Q = "(pointer:coarse)";
const CH_DEFAULT_F = { inv: CH_FILTER_DEFAULT.cinv, frets: CH_FILTER_DEFAULT.frets, set: CH_FILTER_DEFAULT.cset, open: CH_FILTER_DEFAULT.copen, span: CH_FILTER_DEFAULT.span };

// The tap board (mock-up call 1): the Neck's 21 frets and column widths; on touch every column is at least 44 px and the
// board scrolls sideways. One note per string (call 2): a fret tap places the note, a second tap mutes the string; the button
// by each string label shows × (muted), ○ (open) or the fret, and switches muted ↔ open (a fretted string mutes). The string
// buttons stay at the left edge while the board scrolls, so a shape high on the neck can still be muted.
function TapBoard({ tuning, shape, setShape, dotOf }) {
  const coarse = useMedia(COARSE_Q);
  const rowH = coarse ? 44 : 36, dot = coarse ? 30 : 26;
  const cols = `56px ${colPx(tuning.frets).map((n) => { const w = coarse ? Math.max(n, 44) : n; return `minmax(${w}px, ${w}fr)`; }).join(" ")}`;
  const place = (s, f) => setShape(shape.map((v, i) => (i === s ? (v === f ? null : f) : v)));
  const strBtn = (s) => setShape(shape.map((v, i) => (i === s ? (v === null ? 0 : null) : v)));
  // Opened with a shape (a link, ‹ Atlas) on a board that scrolls: the shape's frets, one either side, centred, as the Neck
  // centres a position. Taps never scroll the board.
  const ref = React.useRef(null);
  useEffect(() => {
    const el = ref.current, fs = shape.filter((f) => f !== null && f > 0);
    if (!el || !fs.length || el.scrollWidth <= el.clientWidth) return;
    const lo = el.querySelector(`[data-tap="0-${Math.max(0, Math.min(...fs) - 1)}"]`), hi = el.querySelector(`[data-tap="0-${Math.min(tuning.frets, Math.max(...fs) + 1)}"]`);
    const box = el.getBoundingClientRect(), l = lo.getBoundingClientRect().left - box.left + el.scrollLeft, r = hi.getBoundingClientRect().right - box.left + el.scrollLeft;
    el.scrollLeft = r <= el.clientWidth ? 0 : Math.max(0, (l + r) / 2 - el.clientWidth / 2);
  }, []);
  const out = [];
  for (let s = 0; s < tuning.strings; s++) {
    const v = shape[s], st = v === null ? "muted" : v === 0 ? "open" : `fret ${v}`;
    out.push(
      <button key={"b" + s} data-strbtn={s} onClick={() => strBtn(s)} aria-label={`String ${s + 1} ${tuning.labels[s]}, ${st}. Tap for ${v === null ? "open" : "muted"}`}
        className="itb-str" style={{ height: rowH }}>
        <span>{tuning.labels[s]}</span>
        <span className="itb-badge" style={v === 0 ? { background: THEME.text, color: THEME.panel } : { background: THEME.track, color: THEME.muted }}>{v === null ? "×" : v === 0 ? "○" : v}</span>
      </button>
    );
    for (let f = 0; f <= tuning.frets; f++) {
      const on = v === f, d = on ? dotOf(s, f) : null;
      out.push(
        <button key={s + "-" + f} data-tap={`${s}-${f}`} aria-pressed={on} aria-label={`String ${s + 1} ${tuning.labels[s]}, fret ${f}, ${PLAIN[(tuning.open[s] + f) % 12]}${on ? ", on" : ""}`}
          onClick={() => place(s, f)} className="itb-c"
          style={{ height: rowH, borderRight: f === 0 ? `5px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, background: f === 0 ? THEME.track : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: 11, height: 11 }} />}
          <span className="mn-s" style={{ height: tuning.gauges[s], marginTop: -tuning.gauges[s] / 2 }} />
          {d && (d.root
            ? <span data-ring="1" className="mn-d fdot" style={{ width: dot + 2, height: dot + 2, background: NEUTRAL_CT, color: THEME.ink, fontSize: 12, fontWeight: 800, zIndex: 5, ...ringMask(2, 2) }}>{d.label}</span>
            : <span className="mn-d fdot" style={{ width: dot, height: dot, background: NEUTRAL_CT, color: THEME.ink, fontSize: 12, fontWeight: 800, zIndex: 3 }}>{d.label}</span>)}
        </button>
      );
    }
  }
  out.push(<span key="n" className="itb-str" aria-hidden="true" />);
  for (let f = 0; f <= tuning.frets; f++) out.push(<span key={"n" + f} className="itb-n" style={{ color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</span>);
  return <div ref={ref} className="itb"><div className="itb-g" style={{ gridTemplateColumns: cols }}>{out}</div></div>;
}

// Chord names as one radio group: arrow keys move and choose, as a Track does.
function NameList({ list, chosen, onPick }) {
  const onKeyDown = (e) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = list.findIndex((r) => r.id === chosen.id), n = (i + step + list.length) % list.length;
    onPick(list[n].id);
    const el = e.currentTarget.querySelectorAll('[role="radio"]')[n];
    if (el) el.focus();
  };
  return (
    <div role="radiogroup" aria-label="Chord names" className="inames" onKeyDown={onKeyDown}>
      {list.map((r) => {
        const on = r.id === chosen.id, g = r.gen;
        return (
          <button key={r.id} data-name={r.id} role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onPick(r.id)} className={"iname" + (on ? " on" : "")}>
            <span className="iname-big">{r.name}</span>
            <span className="iname-mid"><span style={{ fontSize: 13, fontWeight: 600 }}>{r.full}</span><span className="text-xs text-muted">{r.degs.join(" ")} · {r.invText}</span></span>
            <span className="iname-tags">
              <span className="atag">{r.omit ? "No 5th" : "Exact"}</span>
              {g && <span className="atag" style={{ color: THEME.text, fontWeight: 600, boxShadow: g.kind === "caged" ? `inset 0 -3px 0 ${POS_COLOR[g.form]}` : undefined }}>{g.mark}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function IdentifyMode({ tuning, at, setAt, labelMode, setLabelMode, onOpen }) {
  const { ishape: shape, iname, size } = at;
  const phone = useMedia(PHONE_Q);
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  // Every change of shape is one undo step and drops the chosen name, so the new shape opens on its first name.
  const setShape = (next) => { HIST.push(shape); set({ ishape: next, iname: null }); };
  const undo = () => { if (HIST.length) set({ ishape: HIST.pop(), iname: null }); };
  const clearShape = () => setShape(shape.map(() => null));

  const info = useMemo(() => shapeInfo(tuning, shape), [tuning, shape.join(",")]);
  const list = useMemo(() => readings(tuning, shape), [tuning, shape.join(",")]);
  const over = useMemo(() => (list.length ? [] : oneOver(tuning, shape)), [tuning, shape.join(","), list]);
  const chosen = list.find((r) => r.id === iname) || list[0] || null;
  const empty = !info.cells.length, few = info.pcs.length < 3;

  // Dot labels follow the chosen name (call 6); with none, plain note names.
  const lab = (pc) => (labelMode === "none" ? "" : chosen ? (labelMode === "name" ? chosen.ctx.name(pc) : chosen.ctx.deg((((pc - chosen.root) % 12) + 12) % 12)) : PLAIN[pc]);
  const dotOf = (s, f) => { const pc = (tuning.open[s] + f) % 12; return { label: lab(pc), root: !!chosen && pc === chosen.root }; };
  const spell = (pc) => (chosen ? chosen.ctx.name(pc) : PLAIN[pc]);
  const low = [...info.cells].sort((a, b) => b.s - a.s);
  const fretsStr = [...shape].reverse().map((f) => (f === null ? "x" : f)).join(" ");

  // Shapes (call 7): a generated shape shows its family, yours lit and tagged; otherwise a Your shape card, then the chord's
  // lowest shapes of every type (Chords mode's order, lowest copies).
  const shapes = useMemo(() => {
    if (!chosen) return null;
    const { root, q, gen, ctx } = chosen, nm = ctx.rn + ctx.sfx;
    const all = chordCards(tuning, root, q, CH_TYPE_KEYS, false);
    const total = chFilter(all, CH_DEFAULT_F).length;
    if (gen) {
      const fam = chordCards(tuning, root, q, [gen.kind], false);
      if (gen.k) fam.push(gen);
      return { head: `${nm} · ${CH_TYPES.find(([k]) => k === gen.kind)[1]}`, note: "Your shape is lit.", count: fam.length, lit: gen.id, cards: fam.sort(chSort), total };
    }
    const mine = shapeCard(tuning, root, q, info.cells);
    const lowest = [...all].sort(chSort).slice(0, LOWEST);
    return { head: `${nm} · your shape and the lowest ${lowest.length}`, note: chAvail(q).includes("caged") ? "" : `${nm} has no CAGED form; these come from its other voicing types.`, count: null, lit: mine.id, cards: [mine, ...lowest], total };
  }, [tuning, chosen && chosen.id, shape.join(",")]);

  const toChords = () => set({ am: "chords", croot: chosen.root, cq: chosen.q, vt: CH_TYPE_KEYS, ...CH_FILTER_DEFAULT, clit: null });
  const labels = (
    <span className="ilabels"><span className="text-xs text-muted">Labels</span>
      <Track label="Labels" cols={3}>{[["degree", "Degrees"], ["name", "Notes"], ["none", "None"]].map(([k, l]) => <Seg key={k} active={labelMode === k} onClick={() => setLabelMode(k)}>{l}</Seg>)}</Track>
    </span>
  );
  const shapeBtns = (u, c) => (
    <span className="flex" style={{ gap: 8 }}>
      <Btn onClick={undo} disabled={!HIST.length}>{u}</Btn>
      <Btn onClick={clearShape} disabled={empty}>{c}</Btn>
    </span>
  );
  const plainNotes = info.pcs.map((p) => PLAIN[p]).join(" ");

  return (
    <React.Fragment>
      <section className="card" aria-label="Your shape" data-ishape>
        <div className="ihead">
          <h2>Your shape{!phone && <span className="text-muted" style={{ fontWeight: 500, fontSize: 12.5 }}>Tap a fret to place a note on that string; tap it again, or the string's button, to mute it.</span>}</h2>
          {labels}
        </div>
        <TapBoard tuning={tuning} shape={shape} setShape={setShape} dotOf={dotOf} />
        {!empty && (
          <div className="iinfo">
            <span>Frets <b data-ifrets style={{ letterSpacing: ".5px" }}>{fretsStr}</b></span>
            <span>Notes <b data-inotes>{low.map((c) => spell((tuning.open[c.s] + c.f) % 12)).join(" ")}</b></span>
            <span>Bass <b>{spell(info.bassPc)}</b></span>
            <span style={{ marginLeft: "auto" }}>{shapeBtns("Undo", "Clear shape")}</span>
          </div>
        )}
        {few && <p data-ihint className="text-sm text-muted" style={{ margin: 0 }}>{empty || phone ? "Tap a fret on each string you play. Tap it again to mute the string. " : ""}The names appear from 3 different notes.</p>}
      </section>

      {chosen && (
        <section className="card" aria-label="Names" style={{ marginTop: 12 }}>
          <h2 className="ahead" style={{ margin: 0 }}>Names<span className="text-muted" style={{ fontWeight: 500, fontSize: 12.5 }}>{list.length}</span>{list.length > 1 && <span className="text-muted" style={{ fontWeight: 500, fontSize: 12.5 }}>Same notes, more than one name. Root in the bass comes first.</span>}</h2>
          <NameList list={list} chosen={chosen} onPick={(id) => set({ iname: id })} />
        </section>
      )}

      {chosen && shapes && (
        <section aria-label="Shapes" data-ishapes style={{ marginTop: 4 }}>
          <CardGrid id="atlas-cards-i" heading={[shapes.head, shapes.note]} count={shapes.count} large={size === "large"}>
            {shapes.cards.map((c0) => {
              const c = { ...c0, ...frame(tuning, c0.cells) }, on = c.id === shapes.lit;
              return (
                <AtlasCard key={c.id} card={c} sub={tonesOf(c, labelMode)} on={on} onToggle={() => {}} setHov={() => {}} onOpen={() => onOpen(c, `${c.title}, ${c.sub}`)}
                  mark={c.mark} markColour={c.kind === "caged" ? POS_COLOR[c.form] : c.kind === "shape" ? THEME.sel : null}
                  formTag={c.kind !== "caged" && c.forms.length ? { label: formName(c.forms), line: formLine(c.forms) } : null}
                  extraTag={on && c.kind !== "shape" ? { label: "Your shape", colour: THEME.sel } : null}>
                  <ChordNeck tuning={tuning} card={c} labelMode={labelMode} lg={size === "large"} />
                </AtlasCard>
              );
            })}
          </CardGrid>
          <div className="ito">
            <Btn data-tochords onClick={toChords}>All {shapes.total} {chName(chosen.root, chosen.q)} voicings in Chords<span aria-hidden="true" style={{ marginLeft: 6 }}>›</span></Btn>
            <span className="text-xs text-muted">Opens Chords mode on {chName(chosen.root, chosen.q)}, every voicing type.</span>
          </div>
        </section>
      )}

      {!chosen && !few && (
        <div role="status" className="card" data-inomatch style={{ marginTop: 12, alignItems: "flex-start", padding: 20 }}>
          <h2 style={{ fontSize: 16 }}>No chord in the list matches {plainNotes}</h2>
          <p className="text-sm text-muted" style={{ margin: 0, lineHeight: 1.45, maxWidth: 620 }}>{info.pcs.length > 4
            ? `It has ${["", "", "", "", "four", "five", "six"][info.pcs.length]} different notes. The chord list goes up to four-note chords; 9th, 11th and 13th chords come later.`
            : `No chord in the list has exactly these ${["", "", "", "three", "four"][info.pcs.length]} notes. 9th, 11th, 13th and altered chords come later.`}</p>
          {over.length > 0 && (
            <div className="flex flex-col" style={{ gap: 6 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Closest, with one note left over</p>
              <ul className="iover" aria-label="Closest, with one note left over">
                {over.map((o) => <li key={o.id} data-over={o.id} className="atag"><b className="text-body">{o.name}</b><span>{o.rest}</span></li>)}
              </ul>
            </div>
          )}
          {shapeBtns("Undo last tap", "Clear shape")}
        </div>
      )}
    </React.Fragment>
  );
}
