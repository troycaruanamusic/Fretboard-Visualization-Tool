// Fretboard Trainer · the Atlas's Chords mode (app-structure plan step 6, Atlas mock-up of 18 Nov): one chord, root and
// quality, as a grid of small necks, one card per shape, in sections by Lay out by. The tuning is an input; shapes come
// from chordshapes.js.
import { useState, useMemo } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { QUAL_COMMON, QUAL_MORE, QUAL_IN_MORE } from "../../core/chords.js";
import { Seg, Track, Row, Card, Btn, useMedia, PHONE_Q, Dialog } from "../../core/ui.jsx";
import { CardGrid, AtlasCard } from "../../core/atlas.jsx";
import { MARKERS, inlayAt } from "./guitar.js";
import { POS_COLOR, formFill, formName } from "./caged.js";
import { ringMask } from "../../core/marker.js";
import { CH_TYPES, CH_QUALS, CH_TYPE_DEF, CH_FRETS, INV_LABEL, chAvail, chIvs, chName, chRootName, chordCards, chFilter, chSections, strLabel } from "./chordshapes.js";

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

// A chord card's neck: six fret columns (more if the shape spans more), as the Scales cards. CAGED forms in their form's
// colour; the other shapes neutral, the root with a gold rim (mock-up, TC 18 Nov).
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
          ? <span {...data} data-ring="1" className="mn-d fdot" style={{ width: d1 + 4, height: d1 + 4, background: col, color: THEME.ink, fontSize: fs, fontWeight: 800, zIndex: 5, ...ringMask(2, 1.5) }}>{lab}</span>
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

export function ChordsMode({ tuning, at, setAt, labelMode, setLabelMode, onOpen }) {
  const { croot, cq, cby, vt, cinv, frets, cset, copen, span, cup, clit, size } = at;
  const phone = useMedia(PHONE_Q);
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState("");
  const [more, setMore] = useState(QUAL_IN_MORE(cq));
  const [moreF, setMoreF] = useState(false);
  const [pickGrp, setPickGrp] = useState(QUAL_MORE.find(([, qs]) => qs.some(([k]) => k === cq)) ? QUAL_MORE.find(([, qs]) => qs.some(([k]) => k === cq))[0] : "");
  const [allFor, setAllFor] = useState("");
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  const avail = chAvail(cq), types = vt.filter((t) => avail.includes(t)), n3 = chIvs(cq).length === 3;
  // A 3-note chord has no 3rd inversion: choosing one drops Inversion: 3rd.
  const setQ = (q) => set({ cq: q, clit: null, ...(chIvs(q).length === 3 && cinv === 3 ? { cinv: null } : {}) });
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

  const nm = chName(croot, cq), qLabel = CH_QUALS.find(([k]) => k === cq)[1];
  const typeNames = types.map((t) => ({ caged: "CAGED forms", triad: "closed triads", drop2: "drop 2", drop3: "drop 3", shell: "shells" })[t]);
  const labNote = labelMode === "name" ? " · note names" : labelMode === "none" ? " · no labels" : "";
  const summary = `${nm} · ${cards.length} voicing${cards.length === 1 ? "" : "s"}` + (phone ? "" : ` · ${typeNames.length ? typeNames.join(", ") : "no voicing type"}`) + labNote;
  const typeShort = types.length ? types.map((t) => CH_TYPES.find(([k]) => k === t)[2]).join(" + ") : "No voicing type";
  const chips = [
    cinv !== null && [`Inversion: ${INV_SEG.find(([v]) => v === cinv)[1]}`, () => set({ cinv: null })],
    frets !== "any" && [`Frets ${CH_FRETS.find(([k]) => k === frets)[1]}`, () => set({ frets: "any" })],
    cup && ["Also 12 up", () => set({ cup: false })],
    cset !== null && [`Strings ${strLabel(cset)}`, () => set({ cset: null })],
    copen !== "allow" && ["No open strings", () => set({ copen: "allow" })],
    span !== CH_FILTER_DEFAULT.span && [`Max span ${span}`, () => set({ span: CH_FILTER_DEFAULT.span })],
  ].filter(Boolean);
  const clear = () => set({ ...CH_FILTER_DEFAULT });

  // Controls, shared by the cards (tablet and desktop), the Filters sheet and the chord picker (phone).
  const rootGrid = (
    <Track label="Root" cols={6}>{Array.from({ length: 12 }, (_, r) => <Seg key={r} tone="gold" active={croot === r} onClick={() => set({ croot: r, clit: null })}>{chRootName(r, cq)}</Seg>)}</Track>
  );
  const qualGrid = <Track label="Quality" cols={3}>{QUAL_COMMON.map(([k, l]) => <Seg key={k} active={cq === k} onClick={() => setQ(k)}>{l}</Seg>)}</Track>;
  const moreGroups = (id) => (
    <div id={id} className="flex flex-col gap-2">{QUAL_MORE.map(([group, qs, n]) => (
      <Row key={group} label={group}>
        <Track label={group} cols={n}>{qs.map(([k, l]) => <Seg key={k} active={cq === k} onClick={() => setQ(k)}>{l}</Seg>)}</Track>
      </Row>
    ))}</div>
  );
  const typeRow = (
    <React.Fragment>
      <Row label="Voicing type">
        <div role="group" aria-label="Voicing type" className="flex flex-wrap" style={{ gap: 6 }}>
          {CH_TYPES.filter(([k]) => avail.includes(k)).map(([k, l]) => (
            <Btn key={k} aria-pressed={types.includes(k)} onClick={() => set({ vt: CH_TYPES.map(([t]) => t).filter((t) => (t === k ? !vt.includes(k) : vt.includes(t))), clit: null })}>{l}</Btn>
          ))}
        </div>
      </Row>
      <p data-typedef className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.45 }}>
        {avail.map((k, i) => <React.Fragment key={k}>{i > 0 && " "}<b className="text-body" style={{ fontWeight: 600 }}>{CH_TYPE_DEF[k][0]}</b>: {CH_TYPE_DEF[k][1]}</React.Fragment>)}
      </p>
    </React.Fragment>
  );
  const byRows = (
    <React.Fragment>
      <Row>
        <Track label="Lay out by" cols={phone ? 2 : 4}>{CH_BY.map(([k, l]) => <Seg key={k} active={cby === k} onClick={() => set({ cby: k })}>{l}</Seg>)}</Track>
      </Row>
      {typeRow}
    </React.Fragment>
  );
  const moreFRows = (
    <div id="ch-morefilters" className="flex flex-col gap-2">
      <Row label="String set">
        <Track label="String set" cols={Math.min(4, setOpts.length + 1)}>
          <Seg active={cset === null} onClick={() => set({ cset: null })}>Any</Seg>
          {setOpts.map((t) => <Seg key={t} active={cset === t} onClick={() => set({ cset: t })}>{strLabel(t)}</Seg>)}
        </Track>
      </Row>
      <Row label="Open strings">
        <Track label="Open strings" cols={2}>{[["allow", "Allow"], ["none", "None"]].map(([k, l]) => <Seg key={k} active={copen === k} onClick={() => set({ copen: k })}>{l}</Seg>)}</Track>
      </Row>
      <Row label="Max span (frets)">
        <Track label="Max span" cols={4}>{SPANS.map((v) => <Seg key={v} active={span === v} onClick={() => set({ span: v })}>{v}</Seg>)}</Track>
      </Row>
    </div>
  );
  const drop = (on) => <span aria-hidden="true" className="text-muted" style={{ marginLeft: 6, display: "inline-block", transform: on ? "rotate(180deg)" : "none" }}>▾</span>;
  const filterRows = (
    <React.Fragment>
      <Row label="Inversion">
        <Track label="Inversion" cols={5}>{INV_SEG.map(([v, l]) => <Seg key={l} active={cinv === v} disabled={v === 3 && n3} onClick={() => set({ cinv: v })}>{l}</Seg>)}</Track>
      </Row>
      <Row label="Frets">
        <Track label="Frets" cols={3}>{CH_FRETS.map(([k, l]) => <Seg key={k} active={frets === k} onClick={() => set({ frets: k })}>{l}</Seg>)}</Track>
      </Row>
      <Row label="Copies">
        <Track label="Copies" cols={2}>{[[false, "Lowest"], [true, "Also 12 up"]].map(([v, l]) => <Seg key={l} active={cup === v} onClick={() => set({ cup: v })}>{l}</Seg>)}</Track>
      </Row>
      <Row>
        <Btn onClick={() => setMoreF((m) => !m)} aria-expanded={moreF} aria-controls="ch-morefilters" aria-label="More filters: string set, open strings, max span">More filters{drop(moreF)}</Btn>
      </Row>
      {moreF && moreFRows}
    </React.Fragment>
  );
  const displayRows = (
    <React.Fragment>
      <Row label="Labels">
        <Track label="Labels" cols={3}>{[["degree", "Degrees"], ["name", "Notes"], ["none", "None"]].map(([k, l]) => <Seg key={k} active={labelMode === k} onClick={() => setLabelMode(k)}>{l}</Seg>)}</Track>
      </Row>
      <Row label="Card size">
        <Track label="Card size" cols={2}>{[["standard", "Standard"], ["large", "Large"]].map(([k, l]) => <Seg key={k} active={size === k} onClick={() => set({ size: k })}>{l}</Seg>)}</Track>
      </Row>
    </React.Fragment>
  );
  const chip = ([t, rm]) => (
    <button key={t} onClick={rm} aria-label={`Remove ${t}`} className="chip flex items-center gap-1.5 px-2 rounded-lg text-xs transition-colors" style={{ background: THEME.ctl, border: `1px solid ${THEME.edge}`, color: THEME.text, fontWeight: 500, flex: "none" }}>
      {t}<span aria-hidden="true" className="text-muted">✕</span>
    </button>
  );

  // Empty state (mock-up frame): why nothing matches, a Remove for each filter and an Add for each type that would match.
  const adds = avail.filter((t) => !types.includes(t)).map((t) => [t, chFilter(chordCards(tuning, croot, cq, [t], cup), flt).length]).filter(([, n]) => n > 0);
  const rootOnly = types.length > 0 && types.every((t) => t === "caged" || t === "shell");
  const why = !types.length ? "No voicing type is chosen." : cinv !== null && cinv > 0 && rootOnly
    ? <React.Fragment>{types.length === 1 ? (types[0] === "shell" ? "Shells always have" : "CAGED forms always have") : "CAGED forms and shells always have"} the root in the bass, so <b className="text-body" style={{ fontWeight: 600 }}>Inversion: {INV_SEG.find(([v]) => v === cinv)[1]}</b> leaves none.</React.Fragment>
    : "The filters leave none of the chosen voicing types.";

  return (
    <React.Fragment>
      {phone ? (
        <div className="abar" role="group" aria-label="Atlas controls">
          <Btn onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={`Filters${chips.length ? `, ${chips.length} active` : ""}`}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" style={{ marginRight: 6, verticalAlign: "-3px" }}><path d="M2 4h12M4.5 8h7M7 12h2" /></svg>
            Filters{chips.length > 0 && <span className="abadge">{chips.length}</span>}
          </Btn>
          <Btn data-pill onClick={() => setPick(true)} aria-haspopup="dialog">{nm}{drop(false)}</Btn>
          <Btn onClick={() => setSheet(true)} aria-haspopup="dialog">By {cby}</Btn>
          <Btn onClick={() => setSheet(true)} aria-haspopup="dialog">{typeShort}</Btn>
          {chips.map(chip)}
        </div>
      ) : (
        <div className="agroups">
          <Card title="Chord">
            <Row label="Root">{rootGrid}</Row>
            <Row label="Quality">{qualGrid}</Row>
            <Row><Btn onClick={() => setMore((m) => !m)} aria-expanded={more} aria-controls="ch-qual-more" aria-label="More qualities">More{drop(more)}</Btn></Row>
            {more && moreGroups("ch-qual-more")}
          </Card>
          <Card title="Lay out by">{byRows}</Card>
          <Card title="Filter">{filterRows}</Card>
          <Card title="Display">{displayRows}</Card>
        </div>
      )}

      <div className="asum">
        <div className="asum-l">
          <span data-summary aria-live="polite" className="text-sm font-semibold text-body">{summary}</span>
          {!phone && chips.map(chip)}
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
            const on = c.id === clit;
            return (
              <AtlasCard key={c.id} card={c} sub={tonesOf(c, labelMode)} on={on} onToggle={() => set({ clit: on ? null : c.id })} setHov={() => {}} onOpen={() => onOpen(c)}
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

      {/* Phone: the chord picker from the chip bar, and the Filters sheet with every control (mock-up frames). */}
      {phone && pick && (
        <Dialog label="Chord" kind="apop" onClose={() => setPick(false)}>
          <div className="flex items-center"><h2 className="adlg-h">{nm}</h2><Btn onClick={() => setPick(false)}>Done</Btn></div>
          <Row label="Root">{rootGrid}</Row>
          <Row label="Quality">{qualGrid}</Row>
          <div className="flex flex-col">
            {QUAL_MORE.map(([group, qs, n]) => (
              <React.Fragment key={group}>
                <button className="apgrp" onClick={() => setPickGrp(pickGrp === group ? "" : group)} aria-expanded={pickGrp === group}>
                  <span>{group}</span><span className="text-muted text-xs">{qs.map(([, l]) => l).join(" · ")} {pickGrp === group ? "▾" : "▸"}</span>
                </button>
                {pickGrp === group && <Row><Track label={group} cols={n}>{qs.map(([k, l]) => <Seg key={k} active={cq === k} onClick={() => setQ(k)}>{l}</Seg>)}</Track></Row>}
              </React.Fragment>
            ))}
          </div>
        </Dialog>
      )}
      {phone && sheet && (
        <Dialog label="Filters" kind="asheet" onClose={() => setSheet(false)}>
          <div aria-hidden="true" className="agrip" />
          <div className="flex items-center" style={{ padding: "8px 16px 0" }}><h2 className="adlg-h">Filters</h2><Btn onClick={clear} disabled={!chips.length}>Reset</Btn></div>
          <div className="asheet-body">
            <section className="asec" aria-label="Chord">
              <h3>Chord</h3>
              {/* The one-row picker (canvas comment, 18 Nov): Root and Quality each open their grid below the row. */}
              <div className="apick2">
                <Btn onClick={() => setOpen(open === "root" ? "" : "root")} aria-expanded={open === "root"} aria-label={`Root, ${chRootName(croot, cq)}`} className="btn text-sm transition-colors apbtn"><span className="text-muted" style={{ fontWeight: 500 }}>Root</span><span style={{ fontWeight: 700, marginLeft: "auto" }}>{chRootName(croot, cq)}</span>{drop(false)}</Btn>
                <Btn onClick={() => setOpen(open === "q" ? "" : "q")} aria-expanded={open === "q"} aria-label={`Quality, ${qLabel}`} className="btn text-sm transition-colors apbtn"><span className="text-muted" style={{ fontWeight: 500 }}>Quality</span><span style={{ fontWeight: 700, marginLeft: "auto", overflow: "hidden", textOverflow: "ellipsis" }}>{qLabel}</span>{drop(false)}</Btn>
              </div>
              {open === "root" && <Row>{rootGrid}</Row>}
              {open === "q" && <React.Fragment><Row>{qualGrid}</Row>{moreGroups("ch-qual-more-s")}</React.Fragment>}
            </section>
            <section className="asec" aria-label="Lay out by"><h3>Lay out by</h3>{byRows}</section>
            <section className="asec" aria-label="Filter"><h3>Filter</h3>{filterRows}</section>
            <section className="asec" aria-label="Display"><h3>Display</h3>{displayRows}</section>
          </div>
          <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${THEME.line}` }}>
            <Btn data-show onClick={() => setSheet(false)} className="btn text-sm transition-colors ashow">Show {cards.length} voicing{cards.length === 1 ? "" : "s"}</Btn>
          </div>
        </Dialog>
      )}
    </React.Fragment>
  );
}
