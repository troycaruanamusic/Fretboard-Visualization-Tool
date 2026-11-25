// Fretboard Trainer · the Chord tab (Build A, E9 model; mock-up call 6): Show = Voicing | All positions | In key.
//   Voicing: one voicing on the neck, the chord's voicing cards under it (v0.41's Atlas Chords, until Build C's list).
//   All positions: the chord's tones across the neck (v0.41's Neck, Show: Chord).
//   In key: the seven chords of the key in one voicing (v0.41's Chords page).
// Voicing and All positions share one Root and Quality (TC, 25 Nov); All positions keeps the In key degree row.
import { KEY_NAME } from "../../core/notes.js";
import { uniAcc } from "../../core/spelling.js";
import { QUAL_COMMON, QUAL_MORE, DIATONIC } from "../../core/chords.js";
import { Seg, Track, Grp, Sel } from "../../core/ui.jsx";
import { Board, KeyGroup } from "./neck.jsx";
import { ChordsPage } from "./chords.jsx";
import { VoicingView } from "./atlaschords.jsx";
import { CH_QUALS, chRootName } from "./chordshapes.js";
import { chordQ, qualPatch } from "./url.js";

const SHOWS = [["voicing", "Voicing"], ["all", "All positions"], ["inkey", "In key"]];
// Quality (mock-up call 5, the E9 grouped menu): the common qualities, then the More groups.
const QUAL_OPTS = [{ group: "Common", items: QUAL_COMMON }, ...QUAL_MORE.map(([group, qs]) => ({ group, items: qs }))];

export function ChordGroups({ cfg, update, onChange = () => {} }) {
  const q = chordQ(cfg);
  return (
    <Grp cap="Chord">
      <Sel label="Root" value={cfg.root} options={Array.from({ length: 12 }, (_, r) => [r, chRootName(r, q)])} onChange={(v) => { update({ arpMode: "quality", root: +v }); onChange(); }} />
      <Sel label="Quality" value={q} options={QUAL_OPTS} onChange={(v) => { update({ arpMode: "quality", ...qualPatch(v, cfg.tonality) }); onChange(); }} />
    </Grp>
  );
}

export function ChordPage({ tuning, cfg, update, globals, cshow, setCshow, ch, setCh, at, setAt, onAll }) {
  const { keyRoot, keyMode, arpMode, diaLabel, root } = cfg;
  const show = (
    <Grp cap="Show">
      <Track label="Show" cols={3}>{SHOWS.map(([k, l]) => <Seg key={k} active={cshow === k} onClick={() => setCshow(k)}>{l}</Seg>)}</Track>
    </Grp>
  );
  if (cshow === "inkey") return <ChordsPage tuning={tuning} cfg={cfg} update={update} ch={ch} setCh={setCh} labelMode={globals.labelMode} setLabelMode={globals.setLabelMode} lead={<React.Fragment>{show}<KeyGroup cfg={cfg} update={update} names={KEY_NAME[keyMode].map((n, i) => [i, uniAcc(n)])} /></React.Fragment>} />;
  const clearLit = () => setAt((a) => ({ ...a, clit: null }));
  if (cshow === "voicing") return <VoicingView tuning={tuning} cfg={cfg} at={at} setAt={setAt} labelMode={globals.labelMode} setLabelMode={globals.setLabelMode} onAll={onAll} lead={<React.Fragment>{show}<ChordGroups cfg={cfg} update={update} onChange={clearLit} /></React.Fragment>} />;

  // All positions: the chord picked by Root and Quality (Any chord) or from the key's degrees (v0.41's Chord → In key, kept
  // here, TC 25 Nov).
  const lead = (
    <React.Fragment>
      {show}
      <Grp cap="Pick by">
        <Track label="Pick the chord by" cols={2}>
          <Seg active={arpMode === "quality"} onClick={() => update({ arpMode: "quality" })}>Root and quality</Seg>
          <Seg active={arpMode === "diatonic"} onClick={() => update({ arpMode: "diatonic", arp: "triad" })}>Degree in key</Seg>
        </Track>
      </Grp>
      {arpMode === "quality" ? <ChordGroups cfg={cfg} update={update} onChange={clearLit} /> : (
        <React.Fragment>
          <KeyGroup cfg={cfg} update={update} view={{ ...cfg, scope: "arpeggio" }} />
          <Grp cap="Chord">
            <Track label="Chords in the key">{DIATONIC[keyMode].map(([rn, off, q]) => {
              const cr = (keyRoot + off) % 12;
              return <Seg key={rn} active={root === cr} onClick={() => update({ root: cr, tonality: q === "maj" ? "major" : "minor", arp: q === "dim" ? "dim" : "triad" })}>{rn}</Seg>;
            })}</Track>
          </Grp>
          <Grp cap="Numbers from">
            <Track label="Numbers from" cols={2}>
              <Seg active={diaLabel === "key"} onClick={() => update({ diaLabel: "key" })}>Key</Seg>
              <Seg active={diaLabel === "chord"} onClick={() => update({ diaLabel: "chord" })}>Chord</Seg>
            </Track>
          </Grp>
        </React.Fragment>
      )}
    </React.Fragment>
  );
  return <Board tuning={tuning} cfg={{ ...cfg, scope: "arpeggio" }} update={update} globals={globals} lead={lead} />;
}
