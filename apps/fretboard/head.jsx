// Fretboard Trainer · the head's Theme menu. (Tuning left the head in Build A: Standard is the app's only tuning, TC 25 Nov.)
import { useState, useEffect } from "../../core/react.js";
import { Btn } from "../../core/ui.jsx";
import { THEMES } from "../../core/theme.js";

// A head menu button with a radio list below it. items: { key, on, main, note, pick }.
function HeadMenu({ label, button, btnLabel, items, cls, caret = true }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") { setOpen(false); ref.current.querySelector("button").focus(); } };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div ref={ref} className={"tuning " + cls}>
      <Btn onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={btnLabel}><span style={{ display: "inline-flex", alignItems: "center" }}>{button}{caret && <span aria-hidden="true" className="text-muted" style={{ marginLeft: 6 }}>▾</span>}</span></Btn>
      {open && (
        <div role="menu" aria-label={label} className="tmenu">
          {items.map(({ key, on, main, note, pick }) => (
            <button key={key} role="menuitemradio" aria-checked={on} className="titem" onClick={() => { pick(); setOpen(false); }}>
              <span style={{ fontWeight: 700 }}>{main}</span>{note && <span className="text-muted">{note}</span>}<span aria-hidden="true" style={{ marginLeft: "auto" }}>{on ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Theme (Round 15): ChordCharts' four themes. Icon and name in the head; the icon alone on a phone.
export function ThemeMenu({ theme, setTheme, phone }) {
  const name = THEMES.find(([k]) => k === theme)[1];
  const icon = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" style={{ display: "block", flex: "none" }}><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" /></svg>;
  return (
    <HeadMenu
      label="Theme"
      cls="hthm"
      button={phone ? icon : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{icon}{name}</span>}
      btnLabel={`Theme: ${name}`}
      caret={!phone}
      items={THEMES.map(([k, l]) => ({ key: k, on: k === theme, main: l, pick: () => setTheme(k) }))}
    />
  );
}
