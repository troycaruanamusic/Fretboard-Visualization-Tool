// Fretboard Trainer · the Modes page.
import { MODES, MODE_REF, MODE_REF_OFF, MODE_ORD } from "../../core/scales.js";
import { Seg, Track, Row, Card, Btn } from "../../core/ui.jsx";

// "1m<sup>7♭5</sup>" as text with a superscript, without innerHTML.
const supText = (s) => s.split(/<sup>|<\/sup>/).map((t, i) => (i % 2 ? <sup key={i}>{t}</sup> : t));

export function ModesPage({ md, setMd, onNeck }) {
  const { parent, view, hit, lkRoot, lkMode, open } = md;
  const key = MODE_REF.order[parent];
  const sc = MODE_REF.keys[key];
  const set = (p) => setMd((m) => ({ ...m, ...p }));
  const rowRefs = React.useRef({});
  // Reverse lookup, as in ChordCharts: a root and a mode give the parent key; the chart moves there and marks the row.
  const lookup = (r, m) => {
    if (r === "" || m === "") { set({ lkRoot: r, lkMode: m }); return; }
    const p = (((+r - MODE_REF_OFF[+m]) % 12) + 12) % 12;
    set({ lkRoot: r, lkMode: m, parent: p, hit: +m });
    setTimeout(() => {
      const el = rowRefs.current[+m];
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    }, 30);
  };
  const toggleOpen = (i) => set({ open: open.includes(i) ? open.filter((x) => x !== i) : [...open, i] });
  const found = hit !== null && lkRoot !== "" && lkMode !== "";

  return (
    <div>
      <div className="mtop">
        <Card title="Parent key">
          {/* The 12 major keys as a 6 × 2 equal-cell grid in gold, as the Key card on Neck and Chords. */}
          <Row>
            <Track label="Parent key" cols={6}>{MODE_REF.order.map((k, i) => <Seg key={k} tone="gold" active={parent === i} onClick={() => set({ parent: i, hit: null, lkRoot: "", lkMode: "" })}>{k}</Seg>)}</Track>
          </Row>
          <Row label="View">
            <Track label="View" cols={2}>{[["notes", "Notes"], ["numbers", "Numbers"]].map(([k, l]) => <Seg key={k} active={view === k} onClick={() => set({ view: k })}>{l}</Seg>)}</Track>
          </Row>
        </Card>
        <Card title="Find a parent key">
          <div className="lk">
            <label>Root<select className="sel" value={lkRoot} onChange={(e) => lookup(e.target.value, lkMode)}><option value="" disabled>Root…</option>{MODE_REF.rootLabels.map((l, p) => <option key={p} value={p}>{l}</option>)}</select></label>
            <label>Mode<select className="sel" value={lkMode} onChange={(e) => lookup(lkRoot, e.target.value)}><option value="" disabled>Mode…</option>{MODE_REF.modes.map((m, i) => <option key={i} value={i}>{m.name}</option>)}</select></label>
            <div data-lookup className="lkres" aria-live="polite">{found
              ? <span>Parent key: {key} major ({sc[hit]} {MODE_REF.modes[hit].name} is its {MODE_ORD[hit]} mode)</span>
              : <span className="text-muted" style={{ fontWeight: 500 }}>Choose a root and a mode.</span>}</div>
          </div>
        </Card>
      </div>

      <section className="card" aria-labelledby="modes-title">
        <h2 id="modes-title">Modes of {key} major <span className="text-muted" style={{ fontWeight: 500, marginLeft: 6 }}>{sc.join(" ")}</span></h2>
        <table className="mtab" role="table" aria-labelledby="modes-title">
          <thead role="rowgroup"><tr role="row">{["Deg", "Mode", "Quality", "Root", "Scale tones", "Solo over"].map((h) => <th key={h} role="columnheader" scope="col">{h}</th>)}<th role="columnheader" scope="col"><span className="sr">On the neck, details</span></th></tr></thead>
          {MODE_REF.modes.map((m, i) => {
            const rootPc = (parent + MODE_REF_OFF[i]) % 12;
            const hot = new Set(m.char);
            const name = `${sc[i]} ${m.name}`;
            const isOpen = open.includes(i);
            return (
              <tbody key={i} role="rowgroup" ref={(el) => { rowRefs.current[i] = el; }} className={"mbody" + (hit === i ? " hit" : "")}>
                <tr role="row" className="mrow" data-mode-row={m.name}>
                  <td role="cell" className="c-deg">{m.deg}</td>
                  <td role="cell" className="c-mode" style={{ fontWeight: 700 }}>{m.name}</td>
                  <td role="cell" className="c-q text-muted">{m.quality}</td>
                  <td role="cell" className="c-root" style={{ fontWeight: 700 }}>{sc[i]}</td>
                  <td role="cell" className="c-tones">
                    <span className="mlab">Scale tones</span>
                    {/* Light square: the characteristic tone, from MODE_REF char. Notes shows the name with its number below. */}
                    <div className="tones">{sc.map((_, j) => {
                      const n = sc[(i + j) % 7], f = m.formula[j];
                      return <span key={j} data-tone={j} data-hot={hot.has(j) ? "1" : undefined} className={"tone" + (hot.has(j) ? " hot" : "")}>
                        {view === "numbers" ? f : <React.Fragment>{n}<small>{f}</small></React.Fragment>}
                        {hot.has(j) && <span className="sr"> (characteristic tone)</span>}
                      </span>;
                    })}</div>
                  </td>
                  <td role="cell" className="c-solo"><span className="mlab">Solo over</span><span data-solo>{supText(m.solo)}</span></td>
                  <td role="cell" className="c-act">
                    <div className="macts">
                      <button data-neck={i} onClick={() => onNeck(rootPc, MODES[i][0], sc[i][0])} className="btn text-sm text-link underline" style={{ padding: "0 4px" }}>Show {name} on the neck</button>
                      <Btn onClick={() => toggleOpen(i)} aria-expanded={isOpen} aria-controls={`mdet-${i}`} aria-label={`${m.name} details`} className="btn mtog flex items-center text-sm transition-colors"><span aria-hidden="true" style={{ display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span></Btn>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr role="row" className="mdet"><td role="cell" colSpan={7} id={`mdet-${i}`}>
                    {/* The rest of the ChordCharts row, in its wording. */}
                    <dl className="mdl" data-detail={m.name}>
                      {[["Solo over", supText(m.solo)], ["Vamp", m.vamp], ["Colour note", m.color], ["Avoid / resolve", m.avoid], ["Feel", m.feel]].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
                    </dl>
                  </td></tr>
                )}
              </tbody>
            );
          })}
        </table>
      </section>
    </div>
  );
}
