#!/usr/bin/env node
/**
 * Vult de instuurder aan bij use cases die er in Buddy Data geen hebben.
 *
 * Nodig omdat de eenmalige import draaide op de geanonimiseerde public/use-cases.json: de namen
 * stonden wel in de Excel maar zijn nooit in de database beland. Importeren kan niet nog een keer
 * — dat script stopt zodra de tabel gevuld is — dus werkt dit de bestaande rijen bij.
 *
 * Gekoppeld wordt op `nummer`, het volgnummer uit kolom A van de sheet. Dat is per use case uniek
 * en verandert niet.
 *
 * De namen komen niet uit de repository: die staat publiek en het bestand daarin is bewust
 * geanonimiseerd. Maak het bestand met namen dus eerst lokaal, en laat het daar staan:
 *
 *   python3 scripts/converteer-excel.py AIideeen.xlsx /tmp/met-namen.json
 *   BUDDY_URL=https://buddy.driessengroep.nl \
 *   BUDDY_DATA_URL=https://buddy.driessengroep.nl/data \
 *   BUDDY_PROJECT=urenmikker \
 *   BUDDY_CLIENT_ID=bd_... BUDDY_CLIENT_SECRET=... \
 *   node scripts/vul-instuurders-aan.mjs /tmp/met-namen.json
 *
 * Zonder --schrijf laat het script alleen zien wat het zou doen.
 * Met --overschrijf worden ook namen bijgewerkt die in Buddy al anders zijn ingevuld; standaard
 * blijven die staan, want daar kan iemand bewust een correctie hebben gedaan.
 */
import { readFile } from 'node:fs/promises';

const argumenten = process.argv.slice(2);
const schrijven = argumenten.includes('--schrijf');
const overschrijven = argumenten.includes('--overschrijf');
const bronPad = argumenten.find((a) => !a.startsWith('--')) ?? 'public/use-cases.json';

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

const bestand = JSON.parse(await readFile(bronPad, 'utf8'));
const uitSheet = new Map(
  (bestand.use_cases ?? [])
    .filter((useCase) => useCase.nummer != null && useCase.instuurder)
    .map((useCase) => [Number(useCase.nummer), String(useCase.instuurder).trim()]),
);

if (uitSheet.size === 0) {
  console.error(
    `${bronPad} bevat geen enkele instuurder. Dit is waarschijnlijk de geanonimiseerde versie;\n` +
      'draai scripts/converteer-excel.py zonder --anoniem en wijs dat bestand aan.',
  );
  process.exit(1);
}
console.log(`${uitSheet.size} instuurders gelezen uit ${bronPad}`);

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

const antwoord = await fetch(`${config.dataUrl}/use_cases?select=id,nummer,titel,instuurder&limit=2000`, {
  headers: { Authorization: `Bearer ${token}`, 'Accept-Profile': schema },
});

if (!antwoord.ok) {
  console.error(`Kon de tabel use_cases niet lezen (HTTP ${antwoord.status}).`);
  process.exit(1);
}

const rijen = await antwoord.json();
console.log(`${rijen.length} rijen in Buddy Data\n`);

const aanvullen = [];
const afwijkend = [];
const zonderNummer = [];

for (const rij of rijen) {
  if (rij.nummer == null) {
    zonderNummer.push(rij);
    continue;
  }
  const naam = uitSheet.get(Number(rij.nummer));
  if (!naam) continue;

  const huidig = rij.instuurder ? String(rij.instuurder).trim() : '';
  if (huidig === '') aanvullen.push({ rij, naam });
  else if (huidig !== naam) afwijkend.push({ rij, naam, huidig });
}

console.log(`aan te vullen (nu leeg):        ${aanvullen.length}`);
console.log(`afwijkend van de sheet:         ${afwijkend.length}`);
console.log(`zonder nummer, overgeslagen:    ${zonderNummer.length}`);

for (const { rij, huidig, naam } of afwijkend) {
  console.log(`  nr ${rij.nummer}: Buddy heeft "${huidig}", sheet zegt "${naam}"`);
}
if (zonderNummer.length > 0) {
  console.log('  (dat zijn use cases die in de tool zijn toegevoegd; die staan niet in de sheet)');
}

const teDoen = overschrijven ? [...aanvullen, ...afwijkend] : aanvullen;

if (teDoen.length === 0) {
  console.log('\nNiets te doen.');
  process.exit(0);
}

if (!schrijven) {
  console.log(`\nProefdraai: er wordt niets weggeschreven. Voeg --schrijf toe om ${teDoen.length} rijen bij te werken.`);
  if (afwijkend.length > 0 && !overschrijven) {
    console.log('Voeg --overschrijf toe als de sheet ook voor de afwijkende namen leidend is.');
  }
  process.exit(0);
}

let gelukt = 0;
for (const { rij, naam } of teDoen) {
  const bijwerken = await fetch(`${config.dataUrl}/use_cases?id=eq.${encodeURIComponent(rij.id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Profile': schema,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instuurder: naam }),
  });

  if (!bijwerken.ok) {
    console.error(`  nr ${rij.nummer} mislukte (HTTP ${bijwerken.status}): ${await bijwerken.text()}`);
    continue;
  }
  gelukt += 1;
}

console.log(`\n${gelukt} van de ${teDoen.length} rijen bijgewerkt.`);
