/**
 * Bouwt één HTML-bestand dat zonder webserver werkt: dubbelklikken is genoeg.
 *
 * Handig zolang de repository private is en GitHub Pages dus niet publiceert,
 * en om de tool te delen met iemand die geen Node heeft. CSS, JavaScript en de
 * dataset gaan in het bestand; de dataStore ziet de ingebouwde data en slaat
 * de fetch over.
 *
 * Gebruik: npm run standalone
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));

const jsBestand = assets.find((naam) => naam.endsWith('.js'));
const cssBestand = assets.find((naam) => naam.endsWith('.css'));
if (!jsBestand || !cssBestand) throw new Error('Geen build gevonden; draai eerst npm run build.');

const js = readFileSync(join(dist, 'assets', jsBestand), 'utf8');
const css = readFileSync(join(dist, 'assets', cssBestand), 'utf8');
const data = readFileSync(join(dist, 'use-cases.json'), 'utf8');

/**
 * Een letterlijke </script> in de inhoud zou de tag vroegtijdig afsluiten, ook
 * midden in een JavaScript-string.
 */
const escape = (inhoud) => inhoud.replace(/<\/(script|style)/gi, (_, tag) => `<\\/${tag}`);

/**
 * String.replace breidt $&, $`, $' en $1 in de vervangtekst uit, en geminificeerde
 * JavaScript zit vol $-tekens. Met een functie als vervanging blijft de inhoud
 * letterlijk staan.
 */
const vervang = (bron, patroon, inhoud) => bron.replace(patroon, () => inhoud);

const veiligeData = escape(data);

/** Mascotte Buddy als data-URI, zodat hij ook zonder losse bestanden meekomt. */
const mimes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
let buddy = null;
for (const [extensie, mime] of Object.entries(mimes)) {
  const pad = join(dist, `buddy${extensie}`);
  if (existsSync(pad)) {
    buddy = `data:${mime};base64,${readFileSync(pad).toString('base64')}`;
    break;
  }
}

let resultaat = vervang(
  html,
  /<link rel="stylesheet"[^>]*href="[^"]*\/assets\/[^"]*"[^>]*>/,
  `<style>${escape(css)}</style>`,
);
resultaat = vervang(
  resultaat,
  /<script type="module"[^>]*src="[^"]*\/assets\/[^"]*"[^>]*><\/script>/,
  `<script>window.__URENMIKKER_DATA__ = ${veiligeData};${
    buddy ? `window.__BUDDY__ = ${JSON.stringify(buddy)};` : ''
  }</script>\n    <script type="module">${escape(js)}</script>`,
);
resultaat = vervang(resultaat, /<link rel="icon"[^>]*>/, '');

const doel = join(dist, 'humain-urenmikker-standalone.html');
writeFileSync(doel, resultaat);
const kb = Math.round(Buffer.byteLength(resultaat) / 1024);
console.log(
  `${doel} geschreven (${kb} kB, buddy ${buddy ? 'inbegrepen' : 'niet gevonden'}) — ` +
    'dubbelklikken werkt, geen server nodig.',
);
