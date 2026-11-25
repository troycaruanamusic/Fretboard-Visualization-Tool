# Fretboard-Visualization-Tool
Guitar Fretboard Visualization Tool: the Fretboard Trainer, and the shared core the planned trainer apps will build on.

## Layout
- `core/`: shared by every app. Note names and keys, spelling, scales and modes (with the NNS modal reference data), chord formulas, the link-format readers, the design system (`design.css`, tokens and controls, the control bar and the rounded-square note markers), the card grid and the tuning object (`tuning.js`: strings, open pitches, labels, gauges and fret count). A core module never imports app code; the build fails if one does.
- `apps/fretboard/`: the Fretboard Trainer (guitar). Its page template, CSS, guitar tuning (`tunings.js`, Standard only), guitar and CAGED data, URL state and the app shell (`main.jsx`). Four tabs (Build A, v0.42): Scale (`scale.jsx`: the bar, the board in `neck.jsx`, and since Build B, v0.43, the list of runs and positions in `pathlist.jsx` with the path engine in `paths.js`), Chord (`chord.jsx`: Voicing in `atlaschords.jsx`, since Build C, v0.44, a sortable list of voicings as rows or cards, with shapes from `chordshapes.js`; All positions on the board, In key in `chords.jsx`), Identify (`atlasidentify.jsx`, its matcher in `identify.js`) and Modes (`modes.jsx`). Frets (the fret range, in the link) and Neck size (S / M / L, per browser) sit in the Scale and Chord bars; their sizes and ranges are in `guitar.js` (Build C). Links from v0.41 (pages Neck, Chords, Atlas) are read and opened on the tab that now holds them (`url.js`). `apps/fretboard/data/open-voicings.csv` is the list of open-position voicings (root, quality, frets low E to high e, a note), bundled by `openvoicings.js` as the Open position voicing type; the build checks every row and fails on a bad one, naming its line. `apps/fretboard/data/scale-patterns.csv` is TC's list of 15 scale patterns (id, key, scale, frets per string low to high, a note), stored in E major and moved to each key by `paths.js`; the build checks that each row runs one octave of its scale, root to root, on adjacent strings within the path rules.
- `build.mjs`: builds each app into one self-contained HTML file, `dist/<app>/index.html`.

## Build
```sh
npm install
npm run build            # every app
npm run build -- fretboard
```
`dist/` is build output and is not committed. Edit `core/` and `apps/`, never the built file. Netlify runs the build (`netlify.toml`) for Deploy Previews and for production, which publishes from the `production` branch.

The built page still compiles its JSX in the browser with Babel, as the single-file versions did.
