// Fretboard Trainer · the head's tuning slot.
import { useState, useEffect } from "../../core/react.js";
import { Btn } from "../../core/ui.jsx";
import { NOTES_SHARP } from "../../core/notes.js";

// The tuning switcher slot in the head (Atlas mock-up). The current tuning's name and open notes, low string to high, come
// from the tuning object; Drop D is listed and unavailable until plan step 8.
export function TuningMenu({ tuning, phone }) {
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
    <div ref={ref} className="tuning">
      <Btn onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>{phone ? `Tuning: ${tuning.name}` : `${tuning.name} tuning`}<span aria-hidden="true" className="text-muted" style={{ marginLeft: 6 }}>▾</span></Btn>
      {open && (
        <div role="menu" aria-label="Tuning" className="tmenu">
          <button role="menuitemradio" aria-checked="true" className="titem" onClick={() => setOpen(false)}><span style={{ fontWeight: 700 }}>{tuning.name}</span><span className="text-muted">{[...tuning.openAbs].reverse().map((m) => NOTES_SHARP[m % 12]).join(" ")}</span><span aria-hidden="true" style={{ marginLeft: "auto" }}>✓</span></button>
          <button role="menuitemradio" aria-checked="false" aria-disabled="true" disabled className="titem" style={{ opacity: 0.5, cursor: "default" }}><span style={{ fontWeight: 700 }}>Drop D</span><span className="text-muted">D A D G B E</span><span className="text-muted" style={{ marginLeft: "auto" }}>Later</span></button>
        </div>
      )}
    </div>
  );
}
