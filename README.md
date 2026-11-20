# Fretboard-Visualization-Tool
Guitar Fretboard Visualization Tool: the Fretboard Trainer, and the shared core the planned trainer apps will build on.

## Layout
- `core/`: shared by every app. Note names and keys, spelling, scales and modes (with the NNS modal reference data), chord formulas, the link-format readers, the design system (`design.css`, tokens and controls), the Atlas card grid and the tuning object (`tuning.js`: strings, open pitches, labels, gauges and fret count). A core module never imports app code; the build fails if one does.
- `apps/fretboard/`: the Fretboard Trainer (guitar). Its page template, CSS, guitar tunings (`tunings.js`, Standard for now), guitar and CAGED data, the four pages (the Atlas's Chords mode in `atlaschords.jsx`, its chord shapes in `chordshapes.js`; Identify in `atlasidentify.jsx`, its matcher in `identify.js`), URL state and the app shell. `apps/fretboard/data/open-voicings.draft.csv` is a draft list of open-position voicings for review; the app does not read it yet.
- `build.mjs`: builds each app into one self-contained HTML file, `dist/<app>/index.html`.

## Build
```sh
npm install
npm run build            # every app
npm run build -- fretboard
```
`dist/` is build output and is not committed. Edit `core/` and `apps/`, never the built file. Netlify runs the build (`netlify.toml`) for Deploy Previews and for production, which publishes from the `production` branch.

The built page still compiles its JSX in the browser with Babel, as the single-file versions did.
