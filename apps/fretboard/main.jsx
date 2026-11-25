// Fretboard Trainer · the app: state, head and tabs.
import { useState, useEffect } from "../../core/react.js";
import { THEME, storedTheme, applyTheme } from "../../core/theme.js";
import { MODE_Q } from "../../core/scales.js";
import { normSpell } from "../../core/spelling.js";
import { Seg, Track, Btn, useMedia, PHONE_Q } from "../../core/ui.jsx";
import { keyPatch } from "./state.js";
import { Help } from "./help.jsx";
import { ScalePage } from "./scale.jsx";
import { ChordPage } from "./chord.jsx";
import { IdentifyPage } from "./atlasidentify.jsx";
import { ModesPage } from "./modes.jsx";
import { ThemeMenu } from "./head.jsx";
import { STANDARD } from "./tunings.js";
import { stateToQuery, queryToState, URL_INIT, qualPatch } from "./url.js";
import { CH_TYPE_KEYS, chTon } from "./chordshapes.js";
import { CH_FILTER_DEFAULT } from "./atlaschords.jsx";

// The four tabs (Build A, E9 model, TC 25 Nov): one neck per working page with a list under it; Modes is the chart.
const TABS = [["scale", "Scale"], ["chord", "Chord"], ["identify", "Identify"], ["modes", "Modes"]];

function FretboardTrainer() {
  // The tuning every page draws from (tunings layer). Standard only (TC, 25 Nov: drop and other tunings are out of this
  // app), so it is not state or part of the link.
  const tuning = STANDARD;
  // Every value starts from the URL (Round 7); v0.41 links are mapped to the new tabs in url.js.
  const [page, setPage] = useState(URL_INIT.top.page);
  const [cshow, setCshow] = useState(URL_INIT.top.cshow);
  const [labelMode, setLabelMode] = useState(URL_INIT.top.labelMode);
  const [isolate, setIsolate] = useState(URL_INIT.top.isolate);
  const [ghost, setGhost] = useState(URL_INIT.top.ghost);
  const [dotColour, setDotColour] = useState(URL_INIT.top.dotColour);
  const [more, setMore] = useState(URL_INIT.top.more);
  const [help, setHelp] = useState(false);
  // Theme (Round 15): stored per browser, applied to <html>; the template already set it before first paint.
  const [theme, setThemeRaw] = useState(() => applyTheme(storedTheme(), false));
  const setTheme = (t) => setThemeRaw(applyTheme(t));
  const [cfg, setCfgRaw] = useState(URL_INIT.cfg);
  // Every cfg change passes through normSpell, so a carried root letter is dropped when it no longer applies (Round 9).
  const setCfg = (f) => setCfgRaw((c) => normSpell(typeof f === "function" ? f(c) : f));
  // Chord tab, In key (the v0.41 Chords page): chosen degree, string set, inversion. Key lives in cfg.
  const [ch, setCh] = useState(URL_INIT.ch);
  // Modes tab: its own parent key, Notes / Numbers, the reverse lookup and the rows opened for details.
  const [md, setMd] = useState(URL_INIT.md);
  // The lists under the necks: the scale cards, the chord voicings and Identify's shape.
  const [at, setAt] = useState(URL_INIT.at);
  const phone = useMedia(PHONE_Q);
  // The URL follows the state: a tab change (or Chord's Show) adds a history step, so Back returns to the previous view; any
  // other change replaces the current step. Back and Forward restore the state the step held (Round 7).
  const view = page + (page === "chord" ? ":" + cshow : "");
  const lastView = React.useRef(view);
  useEffect(() => {
    const st = { top: { page, cshow, labelMode, isolate, ghost, dotColour, more }, cfg, ch, md, at };
    const url = location.pathname + stateToQuery(st) + location.hash;
    const push = lastView.current !== view;
    lastView.current = view;
    if (url === location.pathname + location.search + location.hash && !push) return;
    try { history[push ? "pushState" : "replaceState"](null, "", url); } catch (e) { /* a sandboxed frame: the URL stays */ }
  }, [page, cshow, labelMode, isolate, ghost, dotColour, more, cfg, ch, md, at]);
  useEffect(() => {
    const onPop = () => {
      const st = queryToState(location.search);
      lastView.current = st.top.page + (st.top.page === "chord" ? ":" + st.top.cshow : "");
      setPage(st.top.page); setCshow(st.top.cshow); setLabelMode(st.top.labelMode); setIsolate(st.top.isolate); setGhost(st.top.ghost); setDotColour(st.top.dotColour); setMore(st.top.more);
      setCfgRaw(st.cfg); setCh(st.ch); setMd(st.md); setAt(st.at); setHelp(false);
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
  // Key and Major / Minor (state.js keyPatch): a carried root letter goes with another key (Round 9); the Chord tab's chord
  // follows the key only when it is picked from the key (In key degrees).
  const up = (p) => setCfg((c) => ({ ...c, ...p, ...(p.keyRoot !== undefined && p.keyRoot !== c.keyRoot && p.keySpell === undefined ? { keySpell: null } : {}) }));
  const go = (pg, cv) => { setHelp(false); setPage(pg); if (cv) setCshow(cv); };

  // Examples (Help): trainer state only, Strings included; Labels, View and Other notes stay (UX-15, decision 13 = a).
  const applyPreset = (p) => {
    if (p === "interlock") {
      setCfg((c) => ({ ...c, scope: "pentatonic", pos: "all", strGroup: null, focus: [] }));
      setIsolate(false); go("scale");
    } else if (p === "chordtones") {
      setCfg((c) => ({ ...c, scope: "scale", pos: null, strGroup: null, focus: [] }));
      setIsolate(true); go("scale");
    } else if (p === "dom7") {
      setCfg((c) => ({ ...c, arpMode: "quality", arp: "dom7", tonality: "major", keyMode: "major", root: c.keyRoot, pos: null, strGroup: null, focus: [10] }));
      setIsolate(false); go("chord", "all");
    } else if (p === "walk") {
      setCfg((c) => ({ ...c, arpMode: "diatonic", diaLabel: "key", arp: "triad", tonality: c.keyMode, root: c.keyRoot, pos: null, strGroup: null, focus: [] }));
      setIsolate(false); go("chord", "all");
    }
  };
  // A Modes row link lands on the Scale tab in the state that Key (the mode root), then Scale, then Mode would give there
  // (Round 6). Filters, Labels and Other notes stay, as they do for those choices.
  const showMode = (r, mk, letter) => {
    setCfg((c) => {
      let n = keyPatch(c, { keyRoot: r }, c.keyMode);
      n = { ...n, scope: "scale" };
      const q = MODE_Q(mk);
      n = q === n.keyMode ? { ...n, mode: mk } : keyPatch({ ...n, mode: mk }, { keyMode: q }, q);
      // The row's own root letter (G♭, A♭, C♭, D♯, A♯) goes with it (Round 9); normSpell keeps it only where it is a tie or better.
      return { ...n, keySpell: letter };
    });
    go("scale");
  };
  // All positions of a chord, from a voicing card or an Identify card (Round 14 call 5, TC 19 Nov): the Chord tab on
  // All positions with the card's root and quality, and the card's CAGED window as Position where one window holds the whole
  // shape (else no Position). Strings, Focus and Notes: Chord tones are cleared.
  const openChord = (card) => {
    setCfg((c) => ({ ...c, arpMode: "quality", ...qualPatch(card.q, chTon(card.q)), root: card.root, pos: card.pos, strGroup: null, focus: [] }));
    setIsolate(false);
    go("chord", "all");
  };
  // Identify's link to every voicing of its chord: Chord → Voicing on that chord, every type, the filters cleared.
  const toVoicings = (root, q) => {
    setCfg((c) => ({ ...c, arpMode: "quality", ...qualPatch(q, chTon(q)), root }));
    setAt((a) => ({ ...a, vt: CH_TYPE_KEYS, ...CH_FILTER_DEFAULT, clit: null }));
    go("chord", "voicing");
  };

  return (
    <div className="w-full" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="p-4">
      {/* The head (Build A, streamline items 2 and 10, mock-up call 7): title, the four tabs, Theme, Copy link and Help.
          Tuning and Clear are out. On a phone: title, Theme, Copy link and Help on one row, the tabs on the next. */}
      <header className="head">
        <h1 className="text-xl font-bold text-body" style={{ margin: 0, whiteSpace: "nowrap" }}>Fretboard Trainer</h1>
        <nav className="pagenav" aria-label="Tabs">
          <Track label="Tab" cols={4}>{TABS.map(([k, l]) => <Seg key={k} active={page === k && !help} onClick={() => go(k)}>{l}</Seg>)}</Track>
        </nav>
        <div className="hbtns">
          <ThemeMenu theme={theme} setTheme={setTheme} phone={phone} />
          <Btn onClick={copyLink} aria-live="polite" className="btn copyl text-sm transition-colors">{copied || "Copy link"}</Btn>
          <Btn onClick={() => setHelp((h) => !h)} aria-pressed={help} className="btn text-sm transition-colors">Help</Btn>
        </div>
      </header>

      {help ? <Help onExample={applyPreset} />
        : page === "scale" ? <ScalePage tuning={tuning} cfg={cfg} update={up} globals={globals} at={at} setAt={setAt} />
        : page === "chord" ? <ChordPage tuning={tuning} cfg={cfg} update={up} globals={globals} cshow={cshow} setCshow={setCshow} ch={ch} setCh={setCh} at={at} setAt={setAt} onAll={openChord} />
        : page === "identify" ? <IdentifyPage tuning={tuning} at={at} setAt={setAt} labelMode={labelMode} setLabelMode={setLabelMode} onOpen={openChord} toVoicings={toVoicings} />
        : <ModesPage md={md} setMd={setMd} onNeck={showMode} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FretboardTrainer />);
