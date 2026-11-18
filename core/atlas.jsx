// Shared core · the Atlas: one scale as a card shows it, and the card grid.
import { THEME } from "./theme.js";
import { LETTERS } from "./notes.js";
import { DEG_LABEL, DEG_OVERRIDE, MODE_NAME, MODE_IV, scopeIntervals } from "./scales.js";
import { accs, spellAt, neckLetter, normSpell } from "./spelling.js";

// The scale type alone: "major", "Dorian", "harmonic minor", "minor pentatonic", "major blues".
export const atType = (show, keyMode, mode) => (show === "scale" ? (mode === "ionian" ? "major" : mode === "aeolian" ? "minor" : MODE_NAME[mode]) : `${keyMode} ${show}`);
// One scale as the Neck page gives it for the same Key, Major / Minor, Show and Mode: intervals, chord tones (1 3 5 7), degree
// names, and note names from the Neck's root letter (Round 9), so a card and the Neck it opens read the same.
export function atScale(root, keyMode, show, mode, letter) {
  const ivs = scopeIntervals(keyMode, show, "triad", mode);
  const set = new Set(ivs);
  const par = show === "scale" ? ivs : MODE_IV[keyMode === "major" ? "ionian" : "aeolian"];
  const ct = new Set([par[0], par[2], par[4], par[6]].filter((iv) => set.has(iv)));
  const li = neckLetter(normSpell({ keyRoot: root, keyMode, scope: show, mode, keySpell: letter || null }));
  const degKey = show === "scale" ? mode : show;
  const deg = (iv) => (DEG_OVERRIDE[degKey] && DEG_OVERRIDE[degKey][iv]) || DEG_LABEL[iv];
  const name = (pc) => { const d = /(\d)$/.exec(deg((((pc - root) % 12) + 12) % 12)); return accs(spellAt(li + (d ? +d[1] : 1) - 1, pc)); };
  return { root, keyMode, show, mode, set, ct, letter: LETTERS[((li % 7) + 7) % 7], rootName: accs(spellAt(li, root)), deg, name };
}

// The Atlas card grid (Round 12, moved from the Fretboard app's Atlas page): the heading with its count and note, then the
// cards. Each card lights on a tap and previews on mouse hover; its picture (the app's small neck) sits inside the card's
// button with the title and span; the footer holds the window tag in its colour, the tags, and the "On the neck" link.
export function CardGrid({ heading, count, large, children }) {
  return (
    <section aria-labelledby="atlas-cards" style={{ marginTop: 16 }}>
      <h2 id="atlas-cards" className="ahead">{heading[0]}<span className="text-muted" style={{ fontWeight: 500, fontSize: 12.5 }}>{count}</span><span className="text-muted" style={{ fontWeight: 600, fontSize: 12.5 }}>{heading[1]}</span></h2>
      <div className={"acards" + (large ? " lg" : "")}>
        {children}
      </div>
    </section>
  );
}
export function AtlasCard({ card: c, on, onToggle, setHov, onOpen, mark, markColour, children }) {
  return (
    <div data-card={c.id} data-lit={on ? "1" : undefined} className={"acard" + (on ? " lit" : "")} onClick={onToggle}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHov(c.id); }} onPointerLeave={() => setHov((h) => (h === c.id ? null : h))}>
      <button className="acard-hit" aria-pressed={on} aria-label={`${c.title}, frets ${c.lo} to ${c.hi}`}>
        <span className="acard-top"><span data-title style={{ fontSize: 14, fontWeight: 700, color: THEME.text, whiteSpace: "nowrap" }}>{c.title}</span><span data-frets className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>frets {c.lo}–{c.hi}</span></span>
        {children}
      </button>
      <div className="acard-foot">
        <span className="atag" style={{ boxShadow: `inset 0 -3px 0 ${markColour}`, color: THEME.text, fontWeight: 600 }}>{mark}</span>
        {c.tags.map((t) => <span key={t} className="atag">{t}</span>)}
        <button data-open={c.id} onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-label={`${c.title} on the neck`} className="btn text-sm text-link underline" style={{ padding: "0 4px", marginLeft: "auto" }}>On the neck</button>
      </div>
    </div>
  );
}
