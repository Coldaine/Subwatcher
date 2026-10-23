// Baut die Vorschau-Fassung aus public/index.html.
// Quelle bleibt public/index.html: hier werden nur Pfade umgebogen (Assets der
// Hauptseite), der noindex-Kopf, die Hinweisleiste und die Preview-Schicht
// (preview.css / preview.js) eingesetzt. Danach spiegelt die CI den Ordner nach /preview/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'public/index.html');
const OUT_DIR = join(ROOT, 'public/preview');
const OUT = join(OUT_DIR, 'index.html');

let html = await readFile(SRC, 'utf8');

// Assets der Hauptseite statt Duplikate im Vorschau-Ordner
html = html.replaceAll("src:url('fonts/", "src:url('../fonts/");
html = html.replace('<script src="app.js?v=__VERSION__">', '<script src="../app.js?v=__VERSION__">');
// Der Datensatz-Platzhalter im JSON-LD wird auf der Hauptseite von der CI ersetzt,
// die eingefrorene Vorschau bekommt hier das Build-Datum.
html = html.replace(/__DATEMODIFIED__/g, new Date().toISOString().slice(0, 10));
if (!html.includes('../app.js')) throw new Error('app.js-Pfad nicht umgebogen');
html = html.replace('<script src="vendor/d3-zoom.min.js">', '<script src="../vendor/d3-zoom.min.js">');
if (!html.includes('../vendor/d3-zoom.min.js')) throw new Error('vendor-Pfad nicht umgebogen');

// Icons und Marke liegen im Site-Root, die Vorschau liegt eine Ebene tiefer
html = html.replace('href="favicon.ico"', 'href="../favicon.ico"')
           .replace('href="favicon.svg"', 'href="../favicon.svg"')
           .replace('href="apple-touch-icon.png"', 'href="../apple-touch-icon.png"')
           .replace('src="favicon.svg"', 'src="../favicon.svg"');
if (!html.includes('../favicon.ico') || !html.includes('src="../favicon.svg"')) throw new Error('Icon-Pfade nicht umgebogen');

// nicht indexieren
html = html.replace('<meta name="viewport"', '<meta name="robots" content="noindex,nofollow">\n<meta name="viewport"');

// Hinweisleiste
const banner = '<div style="background:var(--surface-2);color:var(--text-2);border-bottom:1px solid var(--line);'
  + 'font:400 11px/1.6 \'Space Mono\',ui-monospace,monospace;letter-spacing:.04em;'
  + 'padding:6px 18px;text-align:center">Preview build: same data and app.js as the main page, '
  + 'different presentation layer. <a href="../" style="color:var(--accent);text-decoration:underline">Back to the main page</a></div>\n';
html = html.replace('<body>', '<body>\n' + banner);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, html, 'utf8');
console.log(`preview/index.html: ${html.length} Bytes`);
