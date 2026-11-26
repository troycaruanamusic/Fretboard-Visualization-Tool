// Shared core · design-system controls: Seg, Track, Row, Card, Btn, Dialog, media query.
import { useState, useEffect } from "./react.js";
import { THEME } from "./theme.js";

// A choice on a recessed track (BR-03, decision 4 = a). Chosen: grey thumb with a 1.5 px text ring; gold for the key and
// Major / Minor (decision 3 = a); a position colour as an underline, filled when chosen (decision 8 = a).
// Each choice is a radio in its Track's radio group; only the chosen one is a tab stop (A11y-W4, A11y-W5).
export function Seg({ active, onClick, children, tone = "grey", pos = null, disabled = false, ...rest }) {
  const T = THEME;
  const fill = active ? (pos || (tone === "gold" ? T.sel : T.ctlHover)) : "transparent";
  const fg = active ? (pos ? T.ink : tone === "gold" ? T.onSel : T.text) : T.muted;
  const shadow = [active && `0 0 0 1.5px ${T.text}`, pos && !active && `inset 0 -3px 0 ${pos}`].filter(Boolean).join(", ") || "none";
  return (
    <button role="radio" aria-checked={!!active} tabIndex={active ? 0 : -1} onClick={onClick} disabled={disabled} aria-disabled={disabled} className="seg text-sm transition-colors" {...rest}
      style={{ padding: "0 12px", borderRadius: 4, opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer", backgroundColor: fill, color: fg, boxShadow: shadow, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}
// A labelled radio group: one tab stop (the chosen choice, else the first available), arrow keys move and choose (A11y-W4, A11y-W5).
// With cols, an equal-cell grid sized to its widest label (Round 4b); arrow keys still move in reading order.
export function Track({ label, children, cols = 0 }) {
  const ref = React.useRef(null);
  const radios = () => [...ref.current.querySelectorAll('[role="radio"]')];
  useEffect(() => {
    const rs = radios();
    rs.forEach((r) => { r.tabIndex = r.getAttribute("aria-checked") === "true" && !r.disabled ? 0 : -1; });
    if (!rs.some((r) => r.tabIndex === 0)) { const f = rs.find((r) => !r.disabled); if (f) f.tabIndex = 0; }
  });
  const onKeyDown = (e) => {
    const k = e.key;
    const step = k === "ArrowRight" || k === "ArrowDown" ? 1 : k === "ArrowLeft" || k === "ArrowUp" ? -1 : 0;
    if (!step && k !== "Home" && k !== "End") return;
    const rs = radios().filter((r) => !r.disabled);
    if (!rs.length) return;
    e.preventDefault();
    const i = rs.indexOf(document.activeElement);
    const n = k === "Home" ? 0 : k === "End" ? rs.length - 1 : (i + step + rs.length) % rs.length;
    rs[n].focus(); rs[n].click();
  };
  return <span ref={ref} className={cols ? "track gtrack" : "track"} role="radiogroup" aria-label={label} onKeyDown={onKeyDown} style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}>{children}</span>;
}
// A labelled control row inside a group card: label above the controls (IA-05). No label, no label line.
export const Row = ({ label = "", children, className = "" }) => <div className={"row " + className}>{label && <span className="rowlab">{label}</span>}{children}</div>;
// A group card with its heading (IA-05, A11y-W4).
export const Card = ({ title, children }) => <section className="card" aria-label={title}><h2>{title}</h2>{children}</section>;
// A stand-alone button: tonal ctl with a 1 px edge (BR-03, decision 4 = a).
// A toggle (aria-pressed) shows on as a grey thumb with the 1.5 px text ring, like a chosen Seg.
export function Btn({ onClick, children, disabled = false, ...rest }) {
  const on = rest["aria-pressed"] === true;
  return <button onClick={onClick} disabled={disabled} className="btn text-sm transition-colors" {...rest} style={{ padding: "0 12px", borderRadius: 8, background: on ? THEME.ctlHover : THEME.ctl, border: `1px solid ${on ? "transparent" : THEME.edge}`, boxShadow: on ? `0 0 0 1.5px ${THEME.text}` : "none", color: THEME.text, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" }}>{children}</button>;
}

// The control bar (Build A, E9 model): captioned groups in one wrapping row at every width.
export const Bar = ({ label = "Controls", children }) => <section className="bar" aria-label={label}>{children}</section>;
// One captioned group of the bar. The caption labels a single control; a group of several names itself with role="group".
export const Grp = ({ cap, children, ...rest }) => <div className="bgrp" role="group" aria-label={cap} {...rest}><p className="cap" aria-hidden="true">{cap}</p><div className="bctl">{children}</div></div>;
// A native menu at the bar's height. options: [value, label] or { group, items: [[value, label]] } for an optgroup. Gold for the key.
export function Sel({ label, value, onChange, options, gold = false, ...rest }) {
  const opt = ([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>;
  return (
    <select className={"sel" + (gold ? " gold" : "")} aria-label={label} value={String(value)} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((o) => (Array.isArray(o) ? opt(o) : <optgroup key={o.group} label={o.group}>{o.items.map(opt)}</optgroup>))}
    </select>
  );
}
// Labels on the Chord tab (labels round, TC 26 Nov): the same values, with Degrees named Intervals, as the labels there
// are the chord's intervals (R 3 5 ♭7), as E9's "Chord intervals".
export const CHORD_LABELS = [["degree", "Intervals"], ["name", "Notes"], ["none", "None"]];
// Labels (Build A, streamline item 4): one control in the same spot on every board, the right end of the summary row.
export function Labels({ value, set, opts = [["degree", "Degrees"], ["name", "Notes"], ["none", "None"]], cap = "Labels" }) {
  return (
    <span className="labs"><span className="text-xs text-muted">{cap}</span>
      <Track label={cap} cols={opts.length}>{opts.map(([k, l]) => <Seg key={k} active={value === k} onClick={() => set(k)}>{l}</Seg>)}</Track>
    </span>
  );
}
// A filter chip with its ✕.
export const Chip = ({ text, onClear }) => (
  <button onClick={onClear} aria-label={`Remove ${text}`} className="chip flex items-center gap-1.5 px-2 rounded-lg text-xs transition-colors" style={{ background: THEME.ctl, border: `1px solid ${THEME.edge}`, color: THEME.text, fontWeight: 500, flex: "none" }}>
    {text}<span aria-hidden="true" className="text-muted">✕</span>
  </button>
);
// Clear all (streamline item 3): beside the chips, only when a filter is on.
export const ClearAll = ({ onClick }) => <button data-clearall onClick={onClick} className="btn clearall">Clear all</button>;

// A media query as state.
export function useMedia(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q), on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}
export const PHONE_Q = "(max-width:699px)";

// A modal surface (the phone Filters sheet and the Key / Scale picker): focus moves in and is kept in, Escape or the
// backdrop closes it, and focus goes back to the control that opened it.
export function Dialog({ label, onClose, kind, children }) {
  const ref = React.useRef(null), close = React.useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current, prev = document.activeElement, ov = document.body.style.overflow;
    el.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close.current(); return; }
      if (e.key !== "Tab") return;
      const fs = [...el.querySelectorAll("button, select")].filter((b) => !b.disabled && b.tabIndex >= 0);
      if (!fs.length) return;
      const i = fs.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : i === fs.length - 1) { e.preventDefault(); fs[e.shiftKey ? fs.length - 1 : 0].focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ov; if (prev && prev.focus) prev.focus(); };
  }, []);
  return (
    <div className="aback" onClick={() => onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={kind} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
