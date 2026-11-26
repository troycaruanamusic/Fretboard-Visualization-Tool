// Shared core · the Atlas: one scale as a card shows it, and the card grid.
import { THEME } from "./theme.js";
import { LETTERS } from "./notes.js";
import { DEG_LABEL, DEG_OVERRIDE, MODE_NAME, MODE_IV, scaleCT, scopeIntervals } from "./scales.js";
import { accs, spellAt, neckLetter, normSpell } from "./spelling.js";

// The scale type alone: "major", "Dorian", "harmonic minor", "minor pentatonic", "major blues".
export const atType = (show, keyMode, mode) => (show === "scale" ? (mode === "ionian" ? "major" : mode === "aeolian" ? "minor" : MODE_NAME[mode]) : `${keyMode} ${show}`);
// One scale as the Neck page gives it for the same Key, Major / Minor, Show and Mode: intervals, chord tones (1 3 5 7), degree
// names, and note names from the Neck's root letter (Round 9), so a card and the Neck it opens read the same.
export function atScale(root, keyMode, show, mode, letter) {
  const ivs = scopeIntervals(keyMode, show, "triad", mode);
  const set = new Set(ivs);
  const par = MODE_IV[keyMode === "major" ? "ionian" : "aeolian"];
  const ct = new Set((show === "scale" ? scaleCT(mode, ivs) : [par[0], par[2], par[4], par[6]]).filter((iv) => set.has(iv)));
  const li = neckLetter(normSpell({ keyRoot: root, keyMode, scope: show, mode, keySpell: letter || null }));
  const degKey = show === "scale" ? mode : show;
  const deg = (iv) => (DEG_OVERRIDE[degKey] && DEG_OVERRIDE[degKey][iv]) || DEG_LABEL[iv];
  const name = (pc) => { const d = /(\d)$/.exec(deg((((pc - root) % 12) + 12) % 12)); return accs(spellAt(li + (d ? +d[1] : 1) - 1, pc)); };
  return { root, keyMode, show, mode, set, ct, letter: LETTERS[((li % 7) + 7) % 7], rootName: accs(spellAt(li, root)), deg, name };
}

// The Atlas card grid (Round 12, moved from the Fretboard app's Atlas page): the heading with its count and note, then the
// cards. Each card lights on a tap and previews on mouse hover; its picture (the app's small neck) sits inside the card's
// button with the title and span; the footer holds the window tag in its colour, the tags, and the "On the neck" link.
// Chords mode (Round 14) lays out several grids, one per section: each takes its own id, and a heading with no note.
export function CardGrid({ heading, count, large, children, id = "atlas-cards" }) {
  return (
    <section aria-labelledby={id} style={{ marginTop: 16 }}>
      <h2 id={id} className="ahead">{heading[0]}<span className="text-muted" style={{ fontWeight: 500, fontSize: 12.5 }}>{count}</span>{heading[1] && <span className="text-muted" style={{ fontWeight: 600, fontSize: 12.5 }}>{heading[1]}</span>}</h2>
      <div className={"acards" + (large ? " lg" : "")}>
        {children}
      </div>
    </section>
  );
}
// A chord card (Round 14) passes sub, its fret string (x 3 2 0 1 0), in place of the span, and no mark colour for the
// neutral voicing types. Identify (Round 16) adds a tag after the form tag, underlined in its colour (Your shape, gold).
// onOpen (Build A): the footer link, named openLabel; none when the card's tap already does the job.
export function AtlasCard({ card: c, on, onToggle, setHov, onOpen, mark, markColour, children, sub = null, formTag = null, extraTag = null, openLabel = "On the neck" }) {
  return (
    <div data-card={c.id} data-lit={on ? "1" : undefined} className={"acard" + (on ? " lit" : "")} onClick={onToggle}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHov(c.id); }} onPointerLeave={() => setHov((h) => (h === c.id ? null : h))}>
      <button className="acard-hit" aria-pressed={on} aria-label={sub ? `${c.title}, ${sub}` : `${c.title}, frets ${c.lo} to ${c.hi}`}>
        <span className="acard-top"><span data-title style={{ fontSize: 14, fontWeight: 700, color: THEME.text, whiteSpace: "nowrap" }}>{c.title}</span>{sub
          ? <span data-frets className="text-xs text-muted" style={{ whiteSpace: "nowrap", letterSpacing: ".5px" }}>{sub}</span>
          : <span data-frets className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>frets {c.lo}–{c.hi}</span>}</span>
        {children}
      </button>
      <div className="acard-foot">
        <span className="atag" style={{ boxShadow: markColour ? `inset 0 -3px 0 ${markColour}` : undefined, color: THEME.text, fontWeight: 600 }}>{mark}</span>
        {formTag && <span data-formtag className="atag" style={{ color: THEME.text, fontWeight: 600, backgroundImage: formTag.line, backgroundRepeat: "no-repeat", backgroundPosition: "bottom", backgroundSize: "100% 3px" }}>{formTag.label}</span>}
        {extraTag && <span data-extratag className="atag" style={{ boxShadow: `inset 0 -3px 0 ${extraTag.colour}`, color: THEME.text, fontWeight: 600 }}>{extraTag.label}</span>}
        {c.tags.map((t) => <span key={t} className="atag">{t}</span>)}
        {onOpen && <button data-open={c.id} onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-label={`${c.title}: ${openLabel}`} className="btn text-sm text-link underline" style={{ padding: "0 4px", marginLeft: "auto" }}>{openLabel}</button>}
      </div>
    </div>
  );
}
