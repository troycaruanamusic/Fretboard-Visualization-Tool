// Fretboard Trainer · the app: state, head and pages.
import { useState, useEffect } from "../../core/react.js";
import { THEME } from "../../core/theme.js";
import { MODE_Q } from "../../core/scales.js";
import { normSpell } from "../../core/spelling.js";
import { Seg, Track, Btn, useMedia, PHONE_Q } from "../../core/ui.jsx";
import { keepChord } from "./state.js";
import { Board } from "./neck.jsx";
import { Help } from "./help.jsx";
import { ChordsPage } from "./chords.jsx";
import { ModesPage } from "./modes.jsx";
import { AtlasPage } from "./atlas.jsx";
import { TuningMenu } from "./head.jsx";
import { STANDARD } from "./tunings.js";
import { stateToQuery, queryToState, URL_INIT } from "./url.js";
import { QUAL_IN_MORE } from "../../core/chords.js";
import { chTon } from "./chordshapes.js";
import { CH_FILTER_DEFAULT, chAnyFilter } from "./atlaschords.jsx";

function FretboardTrainer() {
  // The tuning every page draws from (tunings layer). Standard only, so it is not yet state or part of the link.
  const tuning = STANDARD;
  // Every value starts from the URL (Round 7); with no query it is the v0.30 default.
  const [page, setPage] = useState(URL_INIT.top.page);
  const [labelMode, setLabelMode] = useState(URL_INIT.top.labelMode);
  const [isolate, setIsolate] = useState(URL_INIT.top.isolate);
  const [ghost, setGhost] = useState(URL_INIT.top.ghost);
  const [dotColour, setDotColour] = useState(URL_INIT.top.dotColour);
  const [more, setMore] = useState(URL_INIT.top.more);
  const [help, setHelp] = useState(false);
  const [cfg, setCfgRaw] = useState(URL_INIT.cfg);
  // Every cfg change passes through normSpell, so a carried root letter is dropped when it no longer applies (Round 9).
  const setCfg = (f) => setCfgRaw((c) => normSpell(typeof f === "function" ? f(c) : f));
  // Chords page state (Round 5): chosen degree, string set, inversion, Numbers from, Scale behind. Key lives in cfg.
  const [ch, setCh] = useState(URL_INIT.ch);
  // Modes page state (Round 6): its own parent key (a major key, index = pitch class), Notes / Numbers, the reverse
  // lookup and the rows opened for details. It does not change the key on Neck or Chords until a row link is used.
  const [md, setMd] = useState(URL_INIT.md);
  // Atlas page state (Round 11): Show, Lay out by, the filters and the lit card. Key, Major / Minor and Mode live in cfg.
  // Chords mode (Round 14) keeps its own chord, layout, voicing types, filters and lit card here too.
  const [at, setAt] = useState(URL_INIT.at);
  // Set by On the neck on an Atlas card: the Neck page then shows the way back. Any other page choice drops it.
  const [fromAtlas, setFromAtlas] = useState(null);
  const phone = useMedia(PHONE_Q);
  // The URL follows the state: a page change adds a history step, so Back returns to the previous page; any other change
  // replaces the current step. Back and Forward restore the state the step held (Round 7).
  const lastPage = React.useRef(page);
  useEffect(() => {
    const st = { top: { page, labelMode, isolate, ghost, dotColour, more }, cfg, ch, md, at };
    const url = location.pathname + stateToQuery(st) + location.hash;
    const push = lastPage.current !== page;
    lastPage.current = page;
    if (url === location.pathname + location.search + location.hash && !push) return;
    try { history[push ? "pushState" : "replaceState"](null, "", url); } catch (e) { /* a sandboxed frame: the URL stays */ }
  }, [page, labelMode, isolate, ghost, dotColour, more, cfg, ch, md, at]);
  useEffect(() => {
    const onPop = () => {
      const st = queryToState(location.search);
      lastPage.current = st.top.page;
      setPage(st.top.page); setLabelMode(st.top.labelMode); setIsolate(st.top.isolate); setGhost(st.top.ghost); setDotColour(st.top.dotColour); setMore(st.top.more);
      setCfgRaw(st.cfg); setCh(st.ch); setMd(st.md); setAt(st.at); setHelp(false); setFromAtlas(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Copy link: the share sheet on a touch device that has one, else the clipboard; the button reads "Copied" for 2 s.
  const [copied, setCopied] = useState("");
  const copyLink = async () => {
    const url = location.href;
    const done = (t) => { setCopied(t); setTimeout(() => setCopied(""), 2000); };
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: "Fretboard Trainer", url }); } catch (e) { /* dismissed */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); done("Copied"); return; } catch (e) { /* fall back below */ }
    const ta = document.createElement("textarea");
    ta.value = url; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok ? "Copied" : "Not copied");
  };
  const globals = { labelMode, isolate, ghost, dotColour, more, setLabelMode, setIsolate, setGhost, setDotColour, setMore };
  // Another key drops a carried root letter (Round 9); the same key tapped again keeps it.
  const up = (p) => setCfg((c) => ({ ...c, ...p, ...(p.keyRoot !== undefined && p.keyRoot !== c.keyRoot ? { keySpell: null } : {}) }));

  // Examples (was Quick start): trainer state only, Strings included; Labels, View and Other notes stay (UX-15, decision 13 = a).
  const applyPreset = (p) => {
    if (p === "interlock") {
      setCfg((c) => ({ ...c, scope: "pentatonic", pos: "all", strGroup: null, focus: [] }));
      setIsolate(false);
    } else if (p === "chordtones") {
      setCfg((c) => ({ ...c, scope: "scale", pos: null, strGroup: null, focus: [] }));
      setIsolate(true);
    } else if (p === "dom7") {
      setCfg((c) => ({ ...c, scope: "arpeggio", arpMode: "quality", arp: "dom7", tonality: "major", keyMode: "major", root: c.keyRoot, pos: null, strGroup: null, focus: [10] }));
      setIsolate(false);
    } else if (p === "walk") {
      setCfg((c) => ({ ...c, scope: "arpeggio", arpMode: "diatonic", diaLabel: "key", arp: "triad", tonality: c.keyMode, root: c.keyRoot, pos: null, strGroup: null, focus: [] }));
      setIsolate(false);
    }
    setHelp(false);
    setFromAtlas(null);
    setPage("neck");
  };
  // A Modes row link lands on the Neck page in the state that Key (the mode root), then Show → Scale, then Mode would give
  // there (Round 6). Filters, Labels and Other notes stay, as they do for those clicks.
  const showMode = (r, mk, letter) => {
    setCfg((c) => {
      let n = { ...c, root: r, keyRoot: r, ...keepChord(c, c.keyMode) };
      if (n.scope !== "scale") n = { ...n, scope: "scale", root: n.keyRoot, ...keepChord(n, n.keyMode) };
      const q = MODE_Q(mk);
      n = q === n.keyMode ? { ...n, mode: mk } : { ...n, mode: mk, keyMode: q, root: n.keyRoot, ...keepChord(n, q) };
      // The row's own root letter (G♭, A♭, C♭, D♯, A♯) goes with it (Round 9); normSpell keeps it only where it is a tie or better.
      return { ...n, keySpell: letter };
    });
    setHelp(false);
    setPage("neck");
  };
  // On the neck, from an Atlas card (Round 11): the Neck page on the card's key, scale, position and strings, as those
  // controls would set them; Focus and Notes: Chord tones are cleared so the Neck shows what the card showed. The card's
  // root letter goes with it, as from a Modes row (Round 9).
  const openCard = (card, str) => {
    const { sc } = card;
    setCfg((c) => {
      const mode = sc.show === "scale" ? sc.mode : MODE_Q(c.mode) === sc.keyMode ? c.mode : sc.keyMode === "major" ? "ionian" : "aeolian";
      return { ...c, root: sc.root, keyRoot: sc.root, keyMode: sc.keyMode, ...keepChord(c, sc.keyMode), scope: sc.show, mode, pos: card.p.num, strGroup: str, focus: [], keySpell: sc.letter };
    });
    setIsolate(false);
    setFromAtlas({ label: `${card.title}, frets ${card.lo}–${card.hi}` });
    setHelp(false);
    setPage("neck");
  };
  // On the neck, from a chord card (Round 14, mock-up item 5, TC 19 Nov): the Neck page on Any chord with the card's root and
  // quality, Show: Chord, and the card's CAGED window as Position where one window holds the whole shape (else no Position).
  // Strings, Focus and Notes: Chord tones are cleared; More opens when the quality is in it, as the Any chord button does.
  const openChord = (card) => {
    const tri = card.q === "major" || card.q === "minor", arp = tri ? "triad" : card.q;
    setCfg((c) => ({ ...c, scope: "arpeggio", arpMode: "quality", arp, tonality: chTon(card.q), root: card.root, pos: card.pos, strGroup: null, focus: [] }));
    setIsolate(false);
    if (QUAL_IN_MORE(arp)) setMore(true);
    setFromAtlas({ label: `${card.title}, ${card.sub}` });
    setHelp(false);
    setPage("neck");
  };
  // Clear: filters only; Key and Show stay (decision 12 = a). On the Atlas it clears the Atlas filters, Strings and Also 12 up;
  // the scale, Lay out by and Display stay (mock-up feedback, item 8).
  const anyFilter = cfg.pos !== null || cfg.strGroup !== null || cfg.focus.length > 0 || isolate;
  // In Chords mode it clears the chord filters (Inversion, Frets, Copies, String set, Open strings, Max span); the chord,
  // Lay out by, the voicing types and Display stay.
  const atFilter = at.am === "scales" ? at.str !== null || at.up : chAnyFilter(at);
  const clearAll = () => {
    if (page === "atlas") { setAt((a) => (a.am === "scales" ? { ...a, str: null, up: false } : { ...a, ...CH_FILTER_DEFAULT })); return; }
    up({ pos: null, strGroup: null, focus: [] }); setIsolate(false);
  };

  return (
    <div className="w-full" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="p-4">
      {/* One 44 px head (IA-03): plain text title (decision 15 = a), the page switch (IA-review, mock-up A), Tuning (Round 11),
          Copy link, Help and Clear. On a phone the switch takes its own row and Tuning and Copy link the next. A page choice
          closes Help; Clear acts on the Neck page and on the Atlas. */}
      <header className="head">
        <h1 className="text-xl font-bold text-body" style={{ margin: 0, whiteSpace: "nowrap" }}>Fretboard Trainer</h1>
        <nav className="pagenav" aria-label="Pages">
          <Track label="Page" cols={4}>{[["neck","Neck"],["chords","Chords"],["modes","Modes"],["atlas","Atlas"]].map(([k,l]) => <Seg key={k} active={page === k && !help} onClick={() => { setPage(k); setHelp(false); setFromAtlas(null); }}>{l}</Seg>)}</Track>
        </nav>
        <div className="hrow2">
          <TuningMenu tuning={tuning} phone={phone} />
          <div className="hbtns">
            <Btn onClick={copyLink} aria-live="polite" className="btn copyl text-sm transition-colors">{copied || "Copy link"}</Btn>
            <Btn onClick={() => setHelp((h) => !h)} aria-pressed={help} className="btn hb hb1 text-sm transition-colors">Help</Btn>
            <Btn onClick={clearAll} disabled={page === "neck" ? !anyFilter : page === "atlas" ? !atFilter : true} className="btn hb text-sm transition-colors">Clear</Btn>
          </div>
        </div>
      </header>

      {help ? <Help onExample={applyPreset} />
        : page === "neck" ? <Board tuning={tuning} cfg={cfg} update={up} globals={globals} back={fromAtlas && { label: fromAtlas.label, go: () => { setFromAtlas(null); setPage("atlas"); } }} />
        : page === "chords" ? <ChordsPage tuning={tuning} cfg={cfg} update={up} ch={ch} setCh={setCh} />
        : page === "modes" ? <ModesPage md={md} setMd={setMd} onNeck={showMode} />
        : <AtlasPage tuning={tuning} cfg={cfg} update={up} at={at} setAt={setAt} labelMode={labelMode} setLabelMode={setLabelMode} onOpen={openCard} onOpenChord={openChord} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FretboardTrainer />);
