#!/usr/bin/env node
/**
 * Zet de use cases uit public/use-cases.json één keer over naar Buddy Data.
 *
 * Bedoeld als eenmalige stap bij het in gebruik nemen; daarna is de database de bron en is het
 * JSON-bestand alleen nog de terugval voor een demo zonder Buddy.
 *
 * Draait met een sleutel die mag schrijven (access "rw"), niet met een gebruikerssessie: dit is
 * een beheerhandeling en hoort niet in een browser thuis.
 *
 *   BUDDY_URL=http://localhost:5000 \
 *   BUDDY_DATA_URL=http://localhost:5010 \
 *   BUDDY_PROJECT=urenmikker \
 *   BUDDY_CLIENT_ID=bd_... BUDDY_CLIENT_SECRET=... \
 *   node scripts/importeer-naar-buddy.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  buddyUrl: (process.env.BUDDY_URL ?? 'http://localhost:5000').replace(/\/+$/, ''),
  dataUrl: (process.env.BUDDY_DATA_URL ?? 'http://localhost:5010').replace(/\/+$/, ''),
  project: process.env.BUDDY_PROJECT ?? 'urenmikker',
  clientId: process.env.BUDDY_CLIENT_ID,
  clientSecret: process.env.BUDDY_CLIENT_SECRET,
};

if (!config.clientId || !config.clientSecret) {
  console.error('Zet BUDDY_CLIENT_ID en BUDDY_CLIENT_SECRET. Die maak je aan in het Buddy Data-beheerscherm.');
  process.exit(1);
}

const tokenAntwoord = await fetch(`${config.buddyUrl}/api/buddy-data/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  }),
});

if (!tokenAntwoord.ok) {
  console.error(`Inloggen mislukte (HTTP ${tokenAntwoord.status}). Controleer het client id en secret.`);
  process.exit(1);
}

const { access_token: token } = await tokenAntwoord.json();
const schema = `app_${config.project}`;

const bestand = JSON.parse(
  await readFile(path.join(__dirname, '..', 'public', 'use-cases.json'), 'utf8'),
);

const rijen = (bestand.use_cases ?? []).map((useCase) => ({
  nummer: useCase.nummer ?? null,
  titel: useCase.titel,
  bedrijf: useCase.bedrijf,
  team: useCase.team ?? null,
  instuurder: useCase.instuurder ?? null,
  tijdsbesparing_uren_per_week: useCase.tijdsbesparing_uren_per_week ?? null,
  status: useCase.status,
  omschrijving: useCase.omschrijving ?? '',
  opmerkingen: useCase.opmerkingen ?? null,
  verwijderd: false,
}));

// Eerst kijken of er al iets staat: twee keer draaien zou anders alles verdubbelen, en dat is aan
// de urentelling niet te zien.
const bestaand = await fetch(`${config.dataUrl}/use_cases?select=id&limit=1`, {
  headers: { Authorization: `Bearer ${token}`, 'Accept-Profile': schema },
});

if (!bestaand.ok) {
  console.error(`Kon de tabel use_cases niet lezen (HTTP ${bestaand.status}). Bestaat hij al in Buddy Data?`);
  process.exit(1);
}

if ((await bestaand.json()).length > 0) {
  console.error('Er staan al use cases in Buddy Data. Leeg de tabel eerst als je opnieuw wilt importeren.');
  process.exit(1);
}

const antwoord = await fetch(`${config.dataUrl}/use_cases`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Profile': schema,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(rijen),
});

if (!antwoord.ok) {
  console.error(`Importeren mislukte (HTTP ${antwoord.status}): ${await antwoord.text()}`);
  process.exit(1);
}

console.log(`${rijen.length} use cases overgezet naar Buddy Data (${schema}.use_cases).`);
