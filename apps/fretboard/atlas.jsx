// Fretboard Trainer · the scale cards under the Scale tab's neck (v0.41's Atlas Scales, Build A): windows as cards and the
// small neck. Build B replaces them with the path list.
import { useMemo } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { NOTES_SHARP } from "../../core/notes.js";
import { MODE_NAME, MODES, OTHER_SCALES, MODE_Q, MODE_REF, MODE_REF_OFF } from "../../core/scales.js";
import { accs, spellAt, autoLetter, neckLetter, normSpell } from "../../core/spelling.js";
import { NOTE_TOK } from "../../core/link.js";
import { Seg, Track, Bar, Grp, Chip, ClearAll } from "../../core/ui.jsx";
import { atType, atScale, CardGrid, AtlasCard } from "../../core/atlas.jsx";
import { MARKERS, inlayAt } from "./guitar.js";
import { TILE, ROOT } from "../../core/marker.js";
import { POS_COLOR, POS_MAJOR, POS_MINOR, CAGED_ANCHOR } from "./caged.js";
import { keyPatch } from "./state.js";

// The scale cards (Round 11, Atlas review and mock-up of 18 Nov; under the neck since Build A): a scale as a grid of small
// necks, one card per shape. Key, Major / Minor, Scale, Mode, Strings and Labels are the bar's (cfg); Lay out by, Copies and
// Card size are the cards' own (at).
const AT_BY = [["position","Position"],["mode","Mode"],["key","Key"]];
const SCALE_LABEL = Object.fromEntries([...MODES, ...OTHER_SCALES]);
const AT_POS = (km) => (km === "major" ? POS_MAJOR : POS_MINOR);
// The cells of one copy of window p: k = 0 is the lowest complete copy, 12 the copy 12 frets up. With fill (Scale only), the
// gap fill of gapCells as exact cells: each pitch missing between the copy's lowest and highest takes the nearest on-board
// cell outside the lowest copy, a tie going above; the upper copy takes the same cell 12 frets up or, where that passes the
// last fret, the nearest on-board cell outside the upper copy.
function atCells(tuning, root, set, p, k, fill) {
  const base = (((root - CAGED_ANCHOR + p.off) % 12) + 12) % 12, top = base + p.w;
  const inSet = (m) => set.has((((m - root) % 12) + 12) % 12);
  const near = (m, b, t) => {
    let best = null;
    for (let s = 0; s < tuning.strings; s++) {
      const f = m - tuning.openAbs[s];
      if (f < 0 || f > tuning.frets || (f >= b && f <= t)) continue;
      const d = f < b ? b - f : f - t;
      if (!best || d < best.d || (d === best.d && f > t)) best = { s, f, d };
    }
    return best;
  };
  const cells = [], have = new Set();
  for (let s = 0; s < tuning.strings; s++) for (let f = base; f <= top; f++) if (inSet(tuning.openAbs[s] + f)) { have.add(tuning.openAbs[s] + f); cells.push({ s, f: f + k, gap: false }); }
  if (fill && have.size) {
    const lo = Math.min(...have), hi = Math.max(...have);
    for (let m = lo + 1; m < hi; m++) {
      if (!inSet(m) || have.has(m)) continue;
      let g = near(m, base, top);
      if (g && k) g = g.f + k <= tuning.frets ? { s: g.s, f: g.f + k } : near(m + k, base + k, top + k);
      if (g) cells.push({ s: g.s, f: g.f, gap: true });
    }
  }
  return cells;
}
// A card's neck: six fret columns (more if the dots span more), the dots centred with the spare column above them.
function atFrame(tuning, cells) {
  const fs = cells.map((c) => c.f), lo = Math.min(...fs), hi = Math.max(...fs);
  const span = hi - lo + 1, cols = Math.max(6, span);
  return { lo, hi, cols, start: Math.max(0, Math.min(tuning.frets - cols + 1, lo - Math.floor((cols - span) / 2))) };
}
// The cards for the current state. Position: the five windows of the scale, low fret to high. Mode: the seven modes in one
// window number, from the same root or from the parent major key (each mode in its own window of that number; root letters
// as the Modes page spells them). Key: the scale in one window in all 12 keys, C up to B. Also 12 up adds each window's copy
// 12 frets higher where all of it fits on the neck.
function atCards(tuning, cfg, at) {
  const { keyRoot, keyMode, mode, scope: show } = cfg, { by, pos, from, up } = at;
  const out = [];
  const add = (id, title, sc, p, tags) => [0, 12].forEach((k) => {
    const base = (((sc.root - CAGED_ANCHOR + p.off) % 12) + 12) % 12;
    if (k && (!up || base + p.w + k > tuning.frets)) return;
    const cells = atCells(tuning, sc.root, sc.set, p, k, sc.show === "scale");
    out.push({ id: id + (k ? "u" : ""), title: title + (k ? " · 12 up" : ""), sc, p, k, at: base + k, cells, tags, ...atFrame(tuning, cells) });
  });
  const typeTag = show === "scale" ? SCALE_LABEL[mode] : `${keyMode} ${show}`;
  if (by === "mode") {
    MODES.forEach(([m], i) => {
      const km = MODE_Q(m), parent = from === "parent";
      const sc = atScale(parent ? (keyRoot + MODE_REF_OFF[i]) % 12 : keyRoot, km, "scale", m, parent ? MODE_REF.keys[MODE_REF.order[keyRoot]][i][0] : cfg.keySpell);
      add(m, `${sc.rootName} ${MODE_NAME[m]}`, sc, AT_POS(km).find((p) => p.num === pos), [km]);
    });
  } else if (by === "key") {
    NOTE_TOK.forEach((tok, r) => {
      const sc = atScale(r, keyMode, show, mode, r === keyRoot ? cfg.keySpell : null);
      add(tok, `${sc.rootName} ${atType(show, keyMode, mode)}`, sc, AT_POS(keyMode).find((p) => p.num === pos), [typeTag]);
    });
  } else {
    const sc = atScale(keyRoot, keyMode, show, mode, cfg.keySpell);
    AT_POS(keyMode).forEach((p) => add(String(p.num), `${p.letter} shape`, sc, p, [typeTag]));
    out.sort((a, b) => a.at - b.at);
  }
  return out;
}

// A card's neck: the window's cells in its colour, chord tones larger (Chord tones: Same size is cut, Build A), the root with
// its ink frame; strings outside the Strings filter as open squares. Spans only, so the whole neck can sit inside the card's button.
function MiniNeck({ tuning, card, labelMode, big, str, lg }) {
  const { sc, p, cells, start, cols } = card;
  const rowH = lg ? 34 : 28, d1 = lg ? 26 : 22, d2 = lg ? 22 : 18, fs = lg ? 12 : 11, col = POS_COLOR[p.letter];
  const hit = {};
  cells.forEach((c) => { hit[c.s * 100 + c.f] = c; });
  const out = [];
  for (let s = 0; s < tuning.strings; s++) {
    const off = str !== null && (s < str || s > str + 2);
    out.push(<span key={"l" + s} className="mn-c" style={{ height: rowH, fontSize: 11, fontWeight: 600, color: off ? THEME.muted : THEME.text }}>{tuning.labels[s]}</span>);
    for (let f = start; f < start + cols; f++) {
      const c = hit[s * 100 + f];
      let dot = null;
      if (c) {
        const pc = (tuning.open[s] + f) % 12, iv = (((pc - sc.root) % 12) + 12) % 12, isRoot = iv === 0, isCT = sc.ct.has(iv);
        const sz = isRoot || !big || isCT ? d1 : d2, lab = labelMode === "name" ? sc.name(pc) : labelMode === "degree" ? sc.deg(iv) : "";
        const data = { "data-c": `${s}-${f}`, "data-gap": c.gap ? "1" : undefined, "data-off": off ? "1" : undefined, title: `${sc.name(pc)} · ${sc.deg(iv)}` };
        dot = off
          ? <span {...data} className="mn-d" style={{ width: sz, height: sz, border: `${isRoot ? 3 : 1.5}px solid ${THEME.edge}`, color: THEME.muted, fontSize: fs, fontWeight: 500, zIndex: 2 }}>{lab}</span>
          : isRoot
            ? <span {...data} data-root="1" className={"mn-d fdot " + ROOT} style={{ width: sz, height: sz, background: col, color: THEME.ink, fontSize: fs, fontWeight: 800, zIndex: 5 }}>{lab}</span>
            : <span {...data} className="mn-d fdot" style={{ width: sz, height: sz, background: col, color: THEME.ink, fontSize: fs, fontWeight: big && isCT ? 800 : 500, zIndex: isCT ? 3 : 2 }}>{lab}</span>;
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

export function ScaleCards({ tuning, cfg, update, at, setAt, labelMode, setIsolate, toBoard }) {
  const { keyRoot, keyMode, mode, scope: show, strGroup: str } = cfg, { by: by0, pos, from, up, size, lit } = at;
  // Lay out by Mode is for Scale with a mode; with another layer the cards fall back to Position, as the control does.
  const by = by0 === "mode" && show !== "scale" ? "position" : by0;
  const set = (p) => setAt((a) => ({ ...a, ...p }));
  const none = show === "blended";
  const cards = useMemo(() => (none ? [] : atCards(tuning, cfg, { ...at, by })), [tuning, keyRoot, keyMode, mode, cfg.keySpell, show, by, pos, from, up]);
  // The lit card: in Position, the card of the neck's position (the bar's Position chooses it as well as a tap).
  const litCard = (() => {
    const c = cards.find((x) => x.id === lit) || null;
    if (by !== "position") return c;
    if (typeof cfg.pos !== "number") return null;
    return c && c.p.num === cfg.pos ? c : cards.find((x) => x.p.num === cfg.pos) || null;
  })();
  const parent = by === "mode" && from === "parent";

  // Names. Lay out by Mode spells the key as the Modes tab does (parent keys), since the scale changes from card to card.
  const vc = normSpell({ ...cfg, scope: by === "mode" ? "pentatonic" : show });
  const keyCell = (i) => (by === "mode" && from === "parent" ? MODE_REF.order[i] : accs(spellAt(i === keyRoot ? neckLetter(vc) : autoLetter(i, vc), i)));
  const type = atType(show, keyMode, mode), Type = type[0].toUpperCase() + type.slice(1);
  const win = `window ${pos} ${AT_POS("major").find((p) => p.num === pos).letter}`;
  const summary = by === "mode" ? `${keyCell(keyRoot)}${from === "parent" ? " major" : ""} · 7 modes, ${from === "parent" ? "same notes" : "same root"} · ${win}`
    : by === "key" ? `${Type} · 12 keys · ${win}`
    : `${keyCell(keyRoot)} ${type} · ${cards.length} windows`;
  const heading = by === "mode" ? [from === "parent" ? `Modes of ${keyCell(keyRoot)} major (parent)` : `Modes of ${keyCell(keyRoot)} (parallel)`, from === "parent" ? "notes fixed, root changes" : "root fixed, notes change"]
    : by === "key" ? ["Keys", "C up to B"] : ["Positions", "low fret to high"];
  const chips = [up && ["Also 12 up", () => set({ up: false })]].filter(Boolean);

  // A card on the neck (Build A, TC 25 Nov): its key, scale, window and copy, as v0.41's On the neck did on the Neck page;
  // Focus and Notes: Chord tones are cleared so the neck shows what the card shows. The card's root letter goes with it
  // (Round 9). Under Mode from the parent key the cards would follow the new key, so there a tap lights the card and
  // On the neck opens it.
  const openCard = (card) => {
    const { sc } = card;
    update(((c) => {
      const m = sc.show === "scale" ? sc.mode : MODE_Q(c.mode) === sc.keyMode ? c.mode : sc.keyMode === "major" ? "ionian" : "aeolian";
      return { ...keyPatch(c, { keyRoot: sc.root, keyMode: sc.keyMode }, sc.keyMode), scope: sc.show, mode: m, pos: card.p.num, focus: [], keySpell: sc.letter };
    })(cfg));
    setIsolate(false);
    set({ lit: card.id });
    toBoard();
  };

  return (
    <section aria-label="Scale cards" style={{ marginTop: 16 }}>
      {/* The cards' own controls as a bar (Build A, streamline item 5); Key, Scale, Mode and Strings are the bar above the neck. */}
      <Bar label="Card controls">
        <Grp cap="Lay out by">
          <Track label="Lay out by" cols={3}>{AT_BY.map(([k, l]) => <Seg key={k} active={by === k} disabled={k === "mode" && show !== "scale"} onClick={() => set({ by: k, lit: null })}>{l}</Seg>)}</Track>
        </Grp>
        {by === "mode" && (
          <Grp cap="Modes from">
            <Track label="Modes from" cols={2}>{[["root","Same root"],["parent","Parent key"]].map(([k, l]) => <Seg key={k} active={from === k} onClick={() => set({ from: k, lit: null })}>{l}</Seg>)}</Track>
          </Grp>
        )}
        {by !== "position" && (
          <Grp cap="Window">
            <Track label="Window" cols={5}>{AT_POS("major").map((p) => <Seg key={p.num} active={pos === p.num} onClick={() => set({ pos: p.num })} pos={POS_COLOR[p.letter]} aria-label={`${p.num} ${p.letter}`}><span aria-hidden="true" style={{ fontSize: 11, fontWeight: 500, marginRight: 3 }}>{p.num}</span>{p.letter}</Seg>)}</Track>
          </Grp>
        )}
        <Grp cap="Copies">
          <Track label="Copies" cols={2}>{[[false,"Lowest"],[true,"Also 12 up"]].map(([v, l]) => <Seg key={l} active={up === v} onClick={() => set({ up: v })}>{l}</Seg>)}</Track>
        </Grp>
        <Grp cap="Card size">
          <Track label="Card size" cols={2}>{[["standard","Standard"],["large","Large"]].map(([k, l]) => <Seg key={k} active={size === k} onClick={() => set({ size: k })}>{l}</Seg>)}</Track>
        </Grp>
      </Bar>

      {none ? (
        <p data-nocards className="text-sm text-muted" style={{ margin: "8px 0 0" }}>The cards show Scale, Pentatonic and Blues; Major and minor is on the neck only.</p>
      ) : (
        <React.Fragment>
          <div className="asum">
            <div className="asum-l">
              <span data-cardsum aria-live="polite" className="text-sm font-semibold text-body">{summary}</span>
              {chips.map(([t, rm]) => <Chip key={t} text={t} onClear={rm} />)}
              {chips.length > 0 && <ClearAll onClick={() => set({ up: false })} />}
            </div>
          </div>
          <CardGrid heading={heading} count={cards.length} large={size === "large"}>
            {cards.map((c) => {
              const on = litCard !== null && c.id === litCard.id;
              return (
                <AtlasCard key={c.id} card={c} on={on} onToggle={() => (parent ? set({ lit: on ? null : c.id }) : openCard(c))} setHov={() => {}} onOpen={parent ? () => openCard(c) : null}
                  mark={<React.Fragment>{c.p.num} {c.p.letter}</React.Fragment>} markColour={POS_COLOR[c.p.letter]}>
                  <MiniNeck tuning={tuning} card={c} labelMode={labelMode} big str={str} lg={size === "large"} />
                </AtlasCard>
              );
            })}
          </CardGrid>
        </React.Fragment>
      )}
    </section>
  );
}
