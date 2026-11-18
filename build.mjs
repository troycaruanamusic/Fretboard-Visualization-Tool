// Builds each app into one self-contained HTML file: the app's template with the shared and app CSS inlined, and its
// modules bundled into one in-browser Babel script (JSX is left for Babel, as before the restructure).
//   npm run build              all apps
//   npm run build -- fretboard one app
// Output: dist/<app>/index.html. The build fails if a core module imports app code.
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const APPS = {
  fretboard: {
    template: "apps/fretboard/index.html",
    entry: "apps/fretboard/main.jsx",
    css: ["core/design.css", "apps/fretboard/app.css"],
  },
};

const fail = (msg) => { console.error("build: " + msg); process.exit(1); };

async function build(name) {
  const app = APPS[name];
  if (!app) fail(`no app "${name}" (apps: ${Object.keys(APPS).join(", ")})`);
  const res = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: [app.entry],
    bundle: true,
    format: "esm",
    jsx: "preserve",
    loader: { ".js": "jsx" },
    charset: "utf8",
    target: "esnext",
    legalComments: "none",
    write: false,
    metafile: true,
    logLevel: "warning",
  });

  // The shared core stands alone: no core module may import from an app.
  for (const [file, info] of Object.entries(res.metafile.inputs)) {
    if (!file.startsWith("core/")) continue;
    for (const imp of info.imports) if (!imp.path.startsWith("core/")) fail(`${file} imports ${imp.path}; the core must not depend on an app`);
  }

  const js = res.outputFiles[0].text.replace(/\n+$/, "");
  if (/^\s*(import|export)\b/m.test(js)) fail("bundle still has an import or export statement");
  if (/<\/script/i.test(js)) fail("bundle contains </script");
  const css = app.css.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\n+$/, "")).join("\n");

  const tpl = fs.readFileSync(path.join(ROOT, app.template), "utf8");
  for (const m of ["<!-- build:css -->", "<!-- build:js -->"]) if (tpl.split(m).length !== 2) fail(`${app.template} needs one ${m}`);
  const html = tpl.split("<!-- build:css -->").join(css).split("<!-- build:js -->").join(js);

  const out = path.join(ROOT, "dist", name, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`build: ${path.relative(ROOT, out)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, ${Object.keys(res.metafile.inputs).length} modules)`);
}

const names = process.argv.slice(2);
for (const n of names.length ? names : Object.keys(APPS)) await build(n);
