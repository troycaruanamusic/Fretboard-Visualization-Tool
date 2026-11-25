// Fretboard Trainer · the Modes tab.
import { MODES, MODE_REF, MODE_REF_OFF, MODE_ORD } from "../../core/scales.js";
import { Btn, Bar, Grp, Sel, Labels } from "../../core/ui.jsx";

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
      {/* The bar (Build A, E9 model): Parent key as a gold menu and Find a parent key; View is the shared Labels control, in the
          same spot as on the other tabs (mock-up). */}
      <Bar>
        <Grp cap="Parent key"><Sel label="Parent key" gold value={parent} options={MODE_REF.order.map((k, i) => [i, k])} onChange={(v) => set({ parent: +v, hit: null, lkRoot: "", lkMode: "" })} /></Grp>
        <Grp cap="Find a parent key">
          <Sel label="Root" value={lkRoot} options={[["", "Root…"], ...MODE_REF.rootLabels.map((l, p) => [p, l])]} onChange={(v) => lookup(v, lkMode)} />
          <Sel label="Mode" value={lkMode} options={[["", "Mode…"], ...MODE_REF.modes.map((m, i) => [i, m.name])]} onChange={(v) => lookup(lkRoot, v)} />
        </Grp>
      </Bar>
      <div className="sumrow">
        <span data-lookup className="text-sm font-semibold text-body" aria-live="polite">{found
          ? `Parent key: ${key} major (${sc[hit]} ${MODE_REF.modes[hit].name} is its ${MODE_ORD[hit]} mode)`
          : <span className="text-muted" style={{ fontWeight: 500 }}>Find a parent key: choose a root and a mode.</span>}</span>
        <Labels value={view} set={(v) => set({ view: v })} opts={[["notes", "Notes"], ["numbers", "Numbers"]]} />
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
                      <button data-neck={i} onClick={() => onNeck(rootPc, MODES[i][0], sc[i][0])} className="btn text-sm text-link underline" style={{ padding: "0 4px" }}>Show {name} in Scale</button>
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
