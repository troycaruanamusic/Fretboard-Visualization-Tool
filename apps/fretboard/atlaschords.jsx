// Fretboard Trainer · Chord → Voicing (v0.41's Atlas Chords mode, app-structure plan step 6; under the Chord tab since Build A):
// one voicing on the neck and the chord's shapes as a grid of small necks under it, in sections by Lay out by. The tuning is
// an input; shapes come from chordshapes.js. Build C replaces the grid with the voicing list.
import { useState, useMemo, useEffect } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { Seg, Track, Btn, Bar, Grp, Labels, Chip, ClearAll, useMedia, PHONE_Q } from "../../core/ui.jsx";
import { CardGrid, AtlasCard } from "../../core/atlas.jsx";
import { MARKERS, colPx, inlayAt } from "./guitar.js";
import { POS_COLOR, formFill, formName } from "./caged.js";
import { TILE, ROOT } from "../../core/marker.js";
import { chordQ } from "./url.js";
import { CH_TYPES, CH_QUALS, CH_TYPE_DEF, CH_FRETS, INV_LABEL, chAvail, chIvs, chName, chRootName, chordCards, chFilter, chSections, strLabel, openRows } from "./chordshapes.js";

const CH_BY = [["family", "Family"], ["inversion", "Inversion"], ["strings", "Strings"], ["position", "Position"]];
const INV_SEG = [[null, "Any"], [0, "Root"], [1, "1st"], [2, "2nd"], [3, "3rd"]];
const SPANS = [3, 4, 5, 6];
// The chord filters and their defaults, so Clear and the chips agree (Clear: filters only; chord, Lay out by, voicing types
// and Display stay, as in Scales mode).
export const CH_FILTER_DEFAULT = { cinv: null, frets: "any", cset: null, copen: "allow", span: 4, cup: false };
export const chAnyFilter = (at) => Object.entries(CH_FILTER_DEFAULT).some(([k, v]) => at[k] !== v);
// Cards shown before "Show all" (mock-up item 7 = phones only, TC 19 Nov): 12 on a phone; tablet and desktop show up to
// 24 and batch above that.
const BATCH = { phone: 12, wide: 24 };

// A chord card's neck: six fret columns (more if the shape spans more), as the scale cards. Every shape in its CAGED form's
// colour; the root with its ink frame (Build A).
export function ChordNeck({ tuning, card, labelMode, lg }) {
  const { cells, start, cols } = card;
  const rowH = lg ? 34 : 28, d1 = lg ? 26 : 22, fs = lg ? 12 : 11;
  // Every shape in its CAGED form colour (Round 15), split where two forms hold it, neutral where none does.
  const col = formFill(card.forms);
  const hit = {};
  cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const out = [];
  for (let s = 0; s < tuning.strings; s++) {
    out.push(<span key={"l" + s} className="mn-c" style={{ height: rowH, fontSize: 11, fontWeight: 600, color: THEME.text }}>{tuning.labels[s]}</span>);
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

// The voicing on the big neck (Build A, TC 25 Nov): the chosen card's notes filled in its CAGED form colour, the root framed,
// the chord's other tones across the neck as open squares, and × at the nut on each string the shape leaves out (mock-up
// call 6). The neck scrolls to the shape when it is wider than the screen.
function VoicingNeck({ tuning, card, labelMode }) {
  const cellH = 46, fontPx = 11;
  const COLS = `30px ${colPx(tuning.frets).map((n) => `minmax(${n}px, ${n}fr)`).join(" ")}`;
  const fill = formFill(card.forms), tones = new Set(card.cells.map((c) => c.iv)), ivs = new Set(card.deg ? chordTones(card) : []);
  const hit = {};
  card.cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const lab = (pc, iv) => (labelMode === "name" ? card.name(pc) : labelMode === "degree" ? card.deg(iv) : "");
  const scrollRef = React.useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const lo = el.querySelector(`[data-fret="${Math.max(0, card.lo - 1)}"]`), hi = el.querySelector(`[data-fret="${Math.min(tuning.frets, card.hi + 1)}"]`);
    if (!lo || !hi) return;
    const box = el.getBoundingClientRect(), l = lo.getBoundingClientRect().left - box.left + el.scrollLeft, r = hi.getBoundingClientRect().right - box.left + el.scrollLeft;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, (l + r) / 2 - el.clientWidth / 2), behavior: smooth ? "smooth" : "auto" });
  }, [tuning, card.id, card.root, card.q]);
  const rows = [];
  for (let s = 0; s < tuning.strings; s++) {
    const muted = card.frets[s] === null;
    rows.push(<div key={"l" + s} className="flex items-center justify-center text-xs font-semibold" style={{ height: cellH, color: muted ? THEME.muted : THEME.text }}>{tuning.labels[s]}</div>);
    for (let f = 0; f <= tuning.frets; f++) {
      const pc = (tuning.open[s] + f) % 12, iv = (((pc - card.root) % 12) + 12) % 12, c = hit[s * 100 + f];
      let dot = null;
      if (c) {
        const isRoot = c.iv === 0, title = `${card.name(pc)} · ${card.deg(c.iv)}`;
        dot = <div data-v={`${s}-${f}`} data-root={isRoot ? "1" : undefined} title={title} className={"fdot " + (isRoot ? ROOT : TILE) + " relative flex items-center justify-center"} style={{ width: 30, height: 30, background: fill, color: THEME.ink, fontSize: fontPx, fontWeight: 800, zIndex: isRoot ? 5 : 3 }}>{lab(pc, c.iv)}</div>;
      } else if (f === 0 && muted) {
        dot = <div data-mute={s} aria-label="muted" className="relative" style={{ color: THEME.muted, fontSize: 15, fontWeight: 700, zIndex: 2 }}>×</div>;
      } else if (ivs.has(iv)) {
        dot = <div data-o={`${s}-${f}`} title={`${card.name(pc)} · ${card.deg(iv)}`} className={TILE + " relative flex items-center justify-center"} style={{ width: 24, height: 24, border: `${iv === 0 ? 3 : 1.5}px solid ${THEME.edge}`, color: THEME.muted, fontSize: fontPx, fontWeight: 500, zIndex: 2 }}>{lab(pc, iv)}</div>;
      }
      rows.push(
        <div key={s + "-" + f} data-fret={s === 0 ? f : undefined} className="relative flex items-center justify-center" style={{ height: cellH, borderRight: f === 0 ? `5px solid ${THEME.nut}` : `2px solid ${THEME.fret}`, background: f === 0 ? THEME.track : undefined }}>
          {inlayAt(tuning.strings, s, f) && <span className="inlay" style={{ width: 11, height: 11 }} />}
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
        {Array.from({ length: tuning.frets + 1 }, (_, f) => (
          <div key={"n" + f} className="flex items-center justify-center text-xs" style={{ height: 24, color: MARKERS[f] ? THEME.text : THEME.muted, fontWeight: MARKERS[f] ? 700 : 400 }}>{f}</div>
        ))}
      </div>
    </div>
  );
}
// The chord's tones as intervals from its root (every tone of the quality, whether or not the shape plays it).
const chordTones = (card) => chIvs(card.q);

// lead: the Chord tab's Show, Root and Quality (Build A). The chord is the Chord tab's one chord (TC, 25 Nov).
export function VoicingView({ tuning, cfg, at, setAt, labelMode, setLabelMode, onAll, lead }) {
  const croot = cfg.root, cq = chordQ(cfg);
  const { cby, vt, frets, cset, copen, span, cup, clit, size } = at;
  const phone = useMedia(PHONE_Q);
  const [moreF, setMoreF] = useState(false);
  const [allFor, setAllFor] = useState("");
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  const avail = chAvail(cq), types = vt.filter((t) => avail.includes(t)), n3 = chIvs(cq).length === 3;
  // A 3-note chord has no 3rd inversion: a quality change drops Inversion: 3rd.
  const cinv = at.cinv === 3 && n3 ? null : at.cinv;
  useEffect(() => { if (cinv !== at.cinv) set({ cinv }); });
  const flt = { inv: cinv, frets, set: cset, open: copen, span };

  const base = useMemo(() => chordCards(tuning, croot, cq, types, cup).map((c) => ({ ...c, ...frame(tuning, c.cells) })), [tuning, croot, cq, types.join("."), cup]);
  const cards = useMemo(() => chFilter(base, flt), [base, cinv, frets, cset, copen, span]);
  const sections = useMemo(() => chSections(cards, cby), [cards, cby]);
  // String sets on offer: those of the chosen types before the String set filter, plus the chosen one.
  const setOpts = useMemo(() => {
    const toks = [...new Set(chFilter(base, { ...flt, set: null }).map((c) => c.tok).concat(cset ? [cset] : []))];
    return toks.sort((a, b) => +a[0] - +b[0] || a.length - b.length || +a[a.length - 1] - +b[b.length - 1]);
  }, [base, cinv, frets, cset, copen, span]);

  // Batching: the first 12 (phone) or 24 cards, then Show all; any change to the cards shows the first batch again.
  const sig = `${croot}|${cq}|${cby}|${types.join(".")}|${cinv}|${frets}|${cset}|${copen}|${span}|${cup}`;
  const limit = phone ? BATCH.phone : BATCH.wide;
  const batched = cards.length > limit && allFor !== sig;
  let left = batched ? limit : Infinity;
  const shown = sections.map((sec) => { const cs = sec.cards.slice(0, Math.max(0, left)); left -= cs.length; return { ...sec, shown: cs }; }).filter((sec) => sec.shown.length);
  // The voicing on the neck: the lit card, else the first card shown.
  const onNeck = cards.find((c) => c.id === clit) || (shown.length ? shown[0].shown[0] : null);

  const nm = chName(croot, cq);
  const typeNames = types.map((t) => ({ caged: "CAGED forms", open: "open position", triad: "closed triads", drop2: "drop 2", drop3: "drop 3", shell: "shells" })[t]);
  const summary = `${nm} · ${cards.length} voicing${cards.length === 1 ? "" : "s"}` + (phone ? "" : ` · ${typeNames.length ? typeNames.join(", ") : "no voicing type"}`);
  const chips = [
    cinv !== null && [`Inversion: ${INV_SEG.find(([v]) => v === cinv)[1]}`, () => set({ cinv: null })],
    frets !== "any" && [`Frets ${CH_FRETS.find(([k]) => k === frets)[1]}`, () => set({ frets: "any" })],
    cup && ["Also 12 up", () => set({ cup: false })],
    cset !== null && [`Strings ${strLabel(cset)}`, () => set({ cset: null })],
    copen !== "allow" && ["No open strings", () => set({ copen: "allow" })],
    span !== CH_FILTER_DEFAULT.span && [`Max span ${span}`, () => set({ span: CH_FILTER_DEFAULT.span })],
  ].filter(Boolean);
  const clear = () => set({ ...CH_FILTER_DEFAULT });
  const drop = (on) => <span aria-hidden="true" className="text-muted" style={{ marginLeft: 6, display: "inline-block", transform: on ? "rotate(180deg)" : "none" }}>▾</span>;

  // Empty state (mock-up frame): why nothing matches, a Remove for each filter and an Add for each type that would match.
  const adds = avail.filter((t) => !types.includes(t)).map((t) => [t, chFilter(chordCards(tuning, croot, cq, [t], cup), flt).length]).filter(([, n]) => n > 0);
  const rootOnly = types.length > 0 && types.every((t) => t === "caged" || t === "shell");
  // Open position is offered for a quality on any root; the list may have no row for this one (B♭ major).
  const why = !types.length ? "No voicing type is chosen." : types.every((t) => t === "open") && !openRows(tuning, croot, cq).length
    ? `The open-position list has no ${nm} voicing.` : cinv !== null && cinv > 0 && rootOnly
    ? <React.Fragment>{types.length === 1 ? (types[0] === "shell" ? "Shells always have" : "CAGED forms always have") : "CAGED forms and shells always have"} the root in the bass, so <b className="text-body" style={{ fontWeight: 600 }}>Inversion: {INV_SEG.find(([v]) => v === cinv)[1]}</b> leaves none.</React.Fragment>
    : "The filters leave none of the chosen voicing types.";

  return (
    <div>
      <Bar>{lead}</Bar>
      <div className="boardwrap">
        <div className="sumrow">
          <span data-summary aria-live="polite" className="text-sm font-semibold text-body">{onNeck ? `${onNeck.title} · ${onNeck.sub}${onNeck.forms.length ? " · " + formName(onNeck.forms) : ""}` : `${nm} · no voicing matches`}</span>
          <Labels value={labelMode} set={setLabelMode} />
        </div>
        {onNeck && <VoicingNeck tuning={tuning} card={onNeck} labelMode={labelMode} />}
      </div>

      <section aria-label="Voicings" style={{ marginTop: 16 }}>
        {/* The cards' controls as a bar (Build A, streamline item 5): Lay out by and the voicing types, then the filters. */}
        <Bar label="Voicing controls">
          <Grp cap="Lay out by">
            <Track label="Lay out by" cols={phone ? 2 : 4}>{CH_BY.map(([k, l]) => <Seg key={k} active={cby === k} onClick={() => set({ cby: k })}>{l}</Seg>)}</Track>
          </Grp>
          <Grp cap="Voicing type">
            {CH_TYPES.filter(([k]) => avail.includes(k)).map(([k, l]) => (
              <Btn key={k} aria-pressed={types.includes(k)} onClick={() => set({ vt: CH_TYPES.map(([t]) => t).filter((t) => (t === k ? !vt.includes(k) : vt.includes(t))), clit: null })}>{l}</Btn>
            ))}
          </Grp>
          <Grp cap="Inversion">
            <Track label="Inversion" cols={5}>{INV_SEG.map(([v, l]) => <Seg key={l} active={cinv === v} disabled={v === 3 && n3} onClick={() => set({ cinv: v })}>{l}</Seg>)}</Track>
          </Grp>
          <Grp cap="Frets">
            <Track label="Frets" cols={6}>{CH_FRETS.map(([k, l]) => <Seg key={k} active={frets === k} onClick={() => set({ frets: k })}>{l}</Seg>)}</Track>
          </Grp>
          <Grp cap="Copies">
            <Track label="Copies" cols={2}>{[[false, "Lowest"], [true, "Also 12 up"]].map(([v, l]) => <Seg key={l} active={cup === v} onClick={() => set({ cup: v })}>{l}</Seg>)}</Track>
          </Grp>
          <Grp cap="Card size">
            <Track label="Card size" cols={2}>{[["standard", "Standard"], ["large", "Large"]].map(([k, l]) => <Seg key={k} active={size === k} onClick={() => set({ size: k })}>{l}</Seg>)}</Track>
          </Grp>
          <Grp cap="More filters">
            <Btn onClick={() => setMoreF((m) => !m)} aria-expanded={moreF} aria-controls="ch-morefilters" aria-label="More filters: string set, open strings, max span">String set · Open · Span{drop(moreF)}</Btn>
          </Grp>
        </Bar>
        {moreF && (
          <div id="ch-morefilters" className="bmore">
            <Bar label="More filters">
              <Grp cap="String set">
                <Track label="String set" cols={Math.min(8, setOpts.length + 1)}>
                  <Seg active={cset === null} onClick={() => set({ cset: null })}>Any</Seg>
                  {setOpts.map((t) => <Seg key={t} active={cset === t} onClick={() => set({ cset: t })}>{strLabel(t)}</Seg>)}
                </Track>
              </Grp>
              <Grp cap="Open strings">
                <Track label="Open strings" cols={2}>{[["allow", "Allow"], ["none", "None"]].map(([k, l]) => <Seg key={k} active={copen === k} onClick={() => set({ copen: k })}>{l}</Seg>)}</Track>
              </Grp>
              <Grp cap="Max span (frets)">
                <Track label="Max span" cols={4}>{SPANS.map((v) => <Seg key={v} active={span === v} onClick={() => set({ span: v })}>{v}</Seg>)}</Track>
              </Grp>
            </Bar>
          </div>
        )}
        <p data-typedef className="text-xs text-muted" style={{ margin: "0 0 4px", lineHeight: 1.45 }}>
          {avail.map((k, i) => <React.Fragment key={k}>{i > 0 && " "}<b className="text-body" style={{ fontWeight: 600 }}>{CH_TYPE_DEF[k][0]}</b>: {CH_TYPE_DEF[k][1]}</React.Fragment>)}
        </p>

        <div className="asum">
          <div className="asum-l">
            <span data-cardsum aria-live="polite" className="text-sm font-semibold text-body">{summary}</span>
            {chips.map(([t, rm]) => <Chip key={t} text={t} onClear={rm} />)}
            {chips.length > 0 && <ClearAll onClick={clear} />}
          </div>
        </div>

        {cards.length === 0 ? (
          <div role="status" className="card" data-empty style={{ marginTop: 16, alignItems: "flex-start" }}>
            <h2 style={{ fontSize: 16 }}>No {nm} voicings match</h2>
            <p className="text-sm text-muted" style={{ margin: 0, lineHeight: 1.45, maxWidth: 560 }}>{why}</p>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {chips.map(([t, rm]) => <Btn key={t} onClick={rm}>Remove {t}</Btn>)}
              {adds.map(([t, n]) => <Btn key={t} onClick={() => set({ vt: CH_TYPES.map(([k]) => k).filter((k) => k === t || vt.includes(k)) })}>Add {CH_TYPES.find(([k]) => k === t)[2]} ({n} voicing{n === 1 ? "" : "s"})</Btn>)}
            </div>
          </div>
        ) : shown.map((sec, i) => (
          <CardGrid key={sec.key} id={`atlas-cards-${i}`} heading={[sec.title, ""]} count={sec.cards.length} large={size === "large"}>
            {sec.shown.map((c) => {
              const on = onNeck !== null && c.id === onNeck.id;
              return (
                <AtlasCard key={c.id} card={c} sub={tonesOf(c, labelMode)} on={on} onToggle={() => set({ clit: c.id })} setHov={() => {}} onOpen={() => onAll(c)} openLabel="All positions"
                  mark={c.mark} markColour={c.kind === "caged" ? POS_COLOR[c.form] : null}
                  formTag={c.kind !== "caged" && c.forms.length ? { label: formName(c.forms), line: formLine(c.forms) } : null}>
                  <ChordNeck tuning={tuning} card={c} labelMode={labelMode} lg={size === "large"} />
                </AtlasCard>
              );
            })}
          </CardGrid>
        ))}
        {batched && (
          <div style={{ marginTop: 16 }}>
            <Btn data-showall onClick={() => setAllFor(sig)} className="btn text-sm transition-colors ashow">Show all {cards.length} voicings</Btn>
          </div>
        )}
      </section>
    </div>
  );
}
