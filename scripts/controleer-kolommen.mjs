#!/usr/bin/env node
/**
 * Kijkt of de tabel use_cases in Buddy Data alle kolommen heeft die de app verwacht.
 *
 * Een kolom ontstaat niet vanzelf als er een veld bij komt in src/types.ts: die maak je aan in het
 * beheerscherm van Buddy (Databases > urenmikker > Tabellen > use_cases > Kolom). Dit script zegt
 * of dat gebeurd is, zodat je het niet hoeft te merken aan een gebruiker die belt dat zijn
 * antwoord verdwenen is.
 *
 *   BUDDY_URL=https://buddy.driessengroep.nl \
 *   BUDDY_DATA_URL=https://buddy.driessengroep.nl/data \
 *   BUDDY_PROJECT=urenmikker \
 *   BUDDY_CLIENT_ID=bd_... BUDDY_CLIENT_SECRET=... \
 *   node scripts/controleer-kolommen.mjs
 *
 * Leesrechten volstaan; het script schrijft niets.
 */

/** Kolom -> hoe hij in Buddy aangemaakt hoort te zijn, voor het geval hij ontbreekt. */
const VERWACHT = {
  nummer: 'geheel getal',
  titel: 'tekst',
  bedrijf: 'tekst',
  team: 'tekst',
  instuurder: 'tekst',
  tijdsbesparing_uren_per_week: 'decimaal getal',
  status: 'tekst',
  omschrijving: 'tekst',
  opmerkingen: 'tekst',
  gevoelige_data: 'tekst, standaardwaarde Onbekend',
  verwijderd: 'ja/nee, standaardwaarde nee',
};

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

const ontbreekt = [];

for (const kolom of Object.keys(VERWACHT)) {
  // Eén kolom opvragen: bestaat hij niet, dan weigert de database het verzoek. Dat werkt ook als
  // de tabel nog leeg is, en daarin verschilt het van kijken naar een rij die er misschien niet is.
  const antwoord = await fetch(`${config.dataUrl}/use_cases?select=${kolom}&limit=1`, {
    headers: { Authorization: `Bearer ${token}`, 'Accept-Profile': schema },
  });

  if (antwoord.ok) {
    console.log(`  aanwezig   ${kolom}`);
    continue;
  }

  if (antwoord.status === 400) {
    console.log(`  ONTBREEKT  ${kolom}`);
    ontbreekt.push(kolom);
    continue;
  }

  console.error(`Kon ${kolom} niet controleren (HTTP ${antwoord.status}): ${await antwoord.text()}`);
  process.exit(1);
}

if (ontbreekt.length === 0) {
  console.log('\nAlle kolommen staan er. De tool kan alles bewaren.');
  process.exit(0);
}

console.log(`\n${ontbreekt.length} kolom(men) ontbreken. Maak ze aan in ${config.buddyUrl}/databases:`);
console.log('urenmikker > tabblad Tabellen > use_cases > knop Kolom.\n');
for (const kolom of ontbreekt) {
  console.log(`  ${kolom} (${VERWACHT[kolom]})`);
}
console.log(
  '\nLet op: een verplichte kolom kan alleen mét standaardwaarde, anders zouden de bestaande\n' +
    'rijen ineens ongeldig zijn.',
);
process.exit(1);
