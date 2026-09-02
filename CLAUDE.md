# CLAUDE.md — werkafspraken voor deze repository

Context en conventies voor wie (of wat) hier verder bouwt. Zie `README.md` voor
setup en deploy.

## Wat dit is

Tool die de AI-tijdsbesparing van Driessen Groep optelt richting 10.000 uur per
jaar, gevisualiseerd als een glazen buis die zich met gouden knikkers vult.

De data staat in Buddy Data en medewerkers loggen in met hun Driessen-account.
Zie **Opslag en inloggen** verderop; `public/use-cases.json` is nog de terugval
voor lokaal werken zonder Buddy.

## Harde regels

1. **Alles loopt via de dataStore.** Componenten en hooks importeren nooit
   `use-cases.json` en doen nooit zelf een `fetch`. De enige toegang is
   `src/data/dataStore.ts` (`getAll` / `add` / `update` / `verwijder`), via
   `createDataStore()` en de hook `useUseCases`. Dat is de reden dat de opslag
   verwisseld kon worden voor Buddy Data zonder één component aan te raken —
   breek het niet.
2. **Rekenwaarden staan in `src/config.ts`.** Jaardoel, werkweken en telmodus
   horen daar, niet als los getal in een component. Rekenen zelf gebeurt in
   `src/lib/uren.ts`.
3. **Brondata is per week, de meter toont per jaar.** `urenPerJaar()` is de
   enige plek waar die omrekening staat.
4. **Nederlands in de UI, in de code en in commits.** Ook variabelenamen; de
   veldnamen in de JSON zijn leidend (`tijdsbesparing_uren_per_week`).
5. **Bedrijf en team zijn twee dingen.** `bedrijf` is een werkmaatschappij uit
   de vaste lijst in `types.ts`; `team` is de afdeling daarbinnen, vrije tekst
   en nullable. Zet nooit een afdeling in de bedrijvenlijst — daar ging het mis
   toen Programmamanagement als bedrijf in de sheet stond. De parser accepteert
   `afdeling` nog als alias voor `bedrijf` voor oudere bestanden.
6. **Het invoerscherm eist titel, omschrijving, instuurder en tijdsbesparing.**
   Het urenveld is bewust geen `type="number"`: daar slikt de browser ongeldige
   tekens stil in en kan er geen melding verschijnen. Het is een tekstveld met
   eigen controle die cijfers en één decimaalteken toelaat en de rest weigert.
   Dat is er om invoer als "onbekend" of "1 tot 6" te voorkomen, precies wat in
   de bronsheet misging.
7. **Nullable blijft nullable.** `instuurder`, `team`, `opmerkingen` en
   `tijdsbesparing_uren_per_week` mogen `null` zijn; toon dat als "anoniem
   ingestuurd" en "nog niet ingevuld" in plaats van als 0.
8. **Zeg eerlijk of iets bewaard wordt.** Draait de app op de terugval
   (`dataStore.persistent === false`), dan moet de UI melden dat wijzigingen
   alleen in deze sessie bestaan, en moet de export een geldige
   `use-cases.json` opleveren.

## Huisstijl

| Rol | Kleur |
| --- | --- |
| Terracotta (accent, markering) | `#DE5A2C` |
| Goud (knikkers, primaire knoppen, logo) | `#E3A93A` |
| Petrol-teal (cijfers, koppen) | `#2E5561` |
| Crème (achtergrond) | `#FBF1E9` |
| Wit (kaarten en lijstregels) | `#FFFFFF` |
| Hairline (randen) | `#EADDCE` |

Poppins voor koppen en cijfers, Inter voor bodytekst. Vormtaal: bogen en halve
cirkels, pill-vormige knoppen. De kop bestaat uit het HUMAIN-beeldmerk met
mascotte Buddy (`public/beeldmerk.png`) en het woord "Urenmikker" ernaast, verder
niets. Ontbreekt het beeldbestand, dan valt `src/components/Beeldmerk.tsx` terug
op het woordmerk in tekst.

Het beeldmerk is afgeleid van `Beeldmerk Humain_RGB.png` (1920x1010). Dat bestand
heeft een halftransparante groene waas over het hele vlak en een spiegeling onder
de letters; allebei moeten eruit voordat het op de crèmekleurige balk staat.
Aanpak: alpha <= 45 op nul zetten (haalt de waas weg, laat Buddy's vachtranden
heel), de band onder y=592 links van x=1440 helemaal wissen (de spiegeling, maar
niet Buddy's poten), bijsnijden op de inhoud en schalen naar 120 px hoog. Kleuren staan als CSS-custom-properties boven in
`src/styles/app.css`; gebruik die tokens en geen losse hex-waarden.

Het tabblad-icoon (`public/favicon.png` en `apple-touch-icon.png`) is de kop van
Buddy, bijgesneden uit `humAIn_1_basis.png`. Bewust zijn kop en niet zijn hele
lijf: op 16 en 32 px valt daar niets meer van te herkennen.

`npm run standalone` bouwt één HTML-bestand met alles erin, voor bekijken en
delen zonder server; `scripts/bouw-standalone.mjs` doet het inlinen. Let daar op
twee valkuilen die er al in zitten: `String.replace` breidt `$&` en `` $` `` in de
vervangtekst uit (gebruik daarom een functie als vervanging), en een letterlijke
`</script>` in de inhoud sluit de tag vroegtijdig af.

`humain-urenmikker.html` in de root is de losse visuele referentie: één bestand
zonder build, met dezelfde look en dezelfde buis-interactie. Handig om de
vormgeving te bekijken of te delen zonder `npm install`.

## Kwaliteitseisen

- Toegankelijk: zichtbare focus, bedienbaar met toetsenbord, focus-trap in
  modals, `prefers-reduced-motion` gerespecteerd, tekstalternatief voor de buis.
- Komen er knikkers bij, dan vallen ze van bovenaf in de buis (`knikkerValt`).
  Dat hoort alleen te gebeuren als er iets is afgerond, niet bij filteren; de
  buis vergelijkt daarvoor de `selectieSleutel` met de vorige render.
- Indeling van de pagina: bovenaan drie uitklapknoppen (gerealiseerde besparing,
  rekeninstellingen, besparing per bedrijf) met hun paneel eronder. Daaronder de
  band: de buis links, meescrollend, en rechts de filters met de use case-lijst.
  Elke knop toont zijn getal ook als het paneel dicht is.
- De use cases staan in een lijst met kolommen (nr, use case, instuurder,
  bedrijf, afdeling/team, tijdsbesparing, status). `nummer` is het volgnummer uit
  kolom A van de sheet en bepaalt ook het `id` (`uc-042`). Een case die in de
  tool wordt toegevoegd krijgt het eerstvolgende nummer; die toekenning hoort in
  de dataStore, want die kent de hele verzameling.
- Omschrijving en opmerkingen zijn in de lijst tot twee regels afgekapt. De knop
  "Openen of wijzigen" toont ze eronder volledig over de hele breedte
  (`.rij__details`, `white-space: pre-line` zodat regeleinden uit de sheet
  blijven staan); de afgekapte versie verdwijnt dan om dubbeling te voorkomen.
- Verwijderen zit achter een bevestiging (`Modal` in `UseCaseRij`), en die knop
  staat in het wijzigformulier zodat je er niet per ongeluk op klikt. Kopregel en regels delen één rasterdefinitie via
  `--lijst-kolommen` op `.lijst-blok`; wijzig je een kolom, pas dan die ene
  variabele aan. De lijst staat naast de buis, dus of de kolommen passen hangt af
  van zijn eigen kolombreedte en niet van het venster: dat gaat via een container
  query op `.lijst-blok`. Onder 1020 px klapt een regel om naar een blokje en
  worden de kolomnamen per veld zichtbaar (`.rij__label`).
- Responsive vanaf 320 px, geen horizontale scroll. Let bij rasters op
  `min-width: 0` en `minmax(min(…, 100%), 1fr)`: lange woorden duwen anders de
  kolom breder dan het scherm. Datzelfde geldt voor formuliervelden: een `input`
  of `select` heeft een eigen minimumbreedte en valt zonder `min-width: 0` over
  het veld ernaast heen.
- `npm run build` (tsc strict + Vite) moet slagen voordat je commit.

## Werkwijze

- Kleine, reviewbare commits met een Nederlandse beschrijving.
- Bij een wijziging in het datamodel horen vier dingen bij elkaar:
  `src/types.ts`, de parser in `jsonDataStore.ts`, de vertaling in
  `buddyDataStore.ts` en de export in `lib/exporteer.ts`. Een nieuwe kolom moet
  bovendien in Buddy Data bestaan — zie hieronder.
- De dataset komt uit de AI-ideeën Excel en wordt gegenereerd met
  `scripts/converteer-excel.py`. Werk de sheet bij en draai het script opnieuw
  in plaats van `use-cases.json` handmatig te redigeren; de mappingregels
  (bedrijfsnamen, lege status, onherleidbare besparing) staan in dat script.
- `instuurder` bevat echte namen en de site is publiek. Anonimiseren kan door
  het veld op `null` te zetten; de UI toont dan "anoniem ingestuurd".

## Opslag en inloggen

### Hoe het in elkaar zit

```
  browser  ──1. inloggen──▶  Microsoft (Entra)
  browser  ──2. token──────▶  buddy.driessengroep.nl  ──▶  Postgres
```

1. De medewerker logt in bij Microsoft met zijn Driessen-account. Op een
   werklaptop merkt hij daar meestal niets van; hij is al ingelogd.
2. Het token dat hij terugkrijgt gaat bij elk verzoek mee naar Buddy. Buddy
   controleert het en bepaalt onder welke rol hij in de database komt.

Er staat **geen sleutel in deze app**. Wie de gebundelde code downloadt heeft
niets: zonder geldig token van een Driessen-account komt hij nergens. De
`VITE_`-waarden zijn adressen en openbare identificatoren, geen geheimen.

De verzoeken gaan naar Buddy en niet rechtstreeks naar de database. Dat is geen
omweg: het is de enige plek waar te zien is wie wat doet — zie het logboek
hieronder.

### Waar wat staat

| | |
|---|---|
| Pagina in Buddy | `urenmikker` — bepaalt wie erbij mag |
| Database | `urenmikker`, tabel `use_cases`, aangemaakt als *gedeeld* |
| Beheerscherm | https://buddy.driessengroep.nl/pages |

*Gedeeld* betekent: elke ingelogde medewerker leest en bewerkt dezelfde lijst.
Verwijderen kan vanuit de browser niet — op een gedeelde lijst wist één misklik
andermans werk. `verwijder()` zet daarom een vlag; `getAll()` laat die rijen weg.

### Een kolom toevoegen

De tabel wordt **niet** vanzelf aangepast als je `types.ts` wijzigt. Doe het in
Buddy:

1. https://buddy.driessengroep.nl/databases → `urenmikker` → tabblad Tabellen
2. bij `use_cases` op **Kolom**, naam en type invullen

Let op: een verplichte kolom kan alleen mét standaardwaarde, anders zouden de
bestaande rijen ineens ongeldig zijn.

De kolom is meteen bruikbaar; je hoeft niets opnieuw te starten. Werk daarna
`types.ts`, `jsonDataStore.ts`, `buddyDataStore.ts` en `lib/exporteer.ts` bij.

### Zien wie wat gedaan heeft

https://buddy.driessengroep.nl/pages → Humain Urenmikker → **Wat er gebeurd is**.
Wie er langskwam, welke tabel, hoeveel rijen en wanneer. Te filteren op persoon,
soort actie en periode.

### `src/data/` in het kort

| bestand | wat het doet |
|---|---|
| `dataStore.ts` | de interface waar alles doorheen gaat |
| `index.ts` | kiest: Buddy Data als de `VITE_`-waarden staan, anders de terugval |
| `entraLogin.ts` | inloggen bij Microsoft, levert een token |
| `buddyClient.ts` | praat met Buddy |
| `buddyDataStore.ts` | vertaalt tussen `UseCase` en de kolommen in de tabel |
| `jsonDataStore.ts` | de terugval: `use-cases.json` in het geheugen |

`buddyClient.ts` is met opzet een klein, op zichzelf staand bestand en geen
npm-pakket: GitHub Actions bouwt met `npm ci` en heeft alleen deze repo.

## Publiceren

Een push naar `main` publiceert vanzelf naar allebei de adressen:

| | |
|---|---|
| https://urenmikker.driessengroep.nl | het echte adres, voor medewerkers |
| https://driessengroep-prm.github.io/Humain-urenmikker/ | GitHub Pages |

Twee workflows, twee builds — Pages serveert onder `/Humain-urenmikker/` en het
subdomein onder `/`, en dat pad zit in de gebouwde bestanden.

Op het subdomein draait geen applicatie: Caddy op de buddy-production VM serveert
de bestanden uit `/data/caddy/apps/urenmikker`. Publiceren is die map vervangen.

Met de hand kan ook, bijvoorbeeld om iets snel te bekijken:

```bash
./scripts/publiceer.sh
```

### Als de deploy faalt

Beide workflows controleren na het bouwen of de verbinding met Buddy Data echt
in de bundel zit. Faalt dat, dan ontbreken de repository-variabelen
`ENTRA_CLIENT_ID` of `ENTRA_TENANT_ID` (Settings → Secrets and variables →
Actions → Variables).

Die controle is er omdat het anders stil misgaat: zonder die waarden snoeit Vite
de hele datalaag weg als dode code en publiceert hij de versie die
`use-cases.json` leest. Je merkt dat pas als iemand belt dat zijn wijziging weg
is.

Faalt het bij **Publiceren** met "Permission denied", dan klopt het secret
`VM_SSH_KEY` niet. Dat is een privésleutel, base64-gecodeerd:
`base64 -i ~/urenmikker-deploy | pbcopy`.

## Wat er nog niet is

- Een eigen Entra-registratie. De app gebruikt nu die van n8n SharePoint; zie
  `TODO.md`.
- Rollen: de pagina staat open voor iedereen met een Driessen-account. Beperken
  kan door in Entra een app-rol te maken en die naam in het Buddy-beheerscherm
  bij deze pagina te zetten.
- Geen datumveld op een use case. "Nieuwste eerst" gebruikt nu de volgorde van
  de dataStore (nieuw toegevoegd staat vooraan). Komt er een
  `aangemaakt_op`-veld, sorteer daar dan op.
- Geen geautomatiseerde tests.
