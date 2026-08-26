# HUMAIN Urenmikker

Dashboard dat laat zien hoeveel uur Driessen Groep met AI bespaart, richting een
jaardoel van **10.000 uur**. Een glazen buis vult zich met gouden knikkers naarmate
er meer gerealiseerde besparing bij komt.

De tool is volledig statisch: geen server, geen database, geen login. Alle use
cases komen uit één JSON-bestand in deze repository en de site draait op GitHub
Pages.

---

## Snel starten

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # productiebuild in dist/
npm run preview  # de gebouwde site lokaal bekijken
```

Lokaal draait de app op basis-URL `/Humain-urenmikker/`. Wil je hem op `/`
draaien (bijvoorbeeld bij een eigen domein), zet dan `BASE_PATH`:

```bash
BASE_PATH=/ npm run build && BASE_PATH=/ npm run preview
```

## Stack

| Onderdeel | Keuze |
| --- | --- |
| Build | Vite 5 |
| UI | React 18 + TypeScript (strict) |
| Styling | Eén CSS-bestand met huisstijltokens, geen framework |
| Data | `public/use-cases.json`, ingelezen via de dataStore |
| Hosting | GitHub Pages via GitHub Actions |

---

## De data: `use-cases.json`

Het bronbestand staat op **`public/use-cases.json`**. Alles in de map `public/`
komt ongewijzigd in de build terecht, dus dit bestand is zowel in de repository
te bewerken als op de gepubliceerde site op te vragen.

```jsonc
{
  "versie": 1,
  "bijgewerkt_op": "2026-08-21",
  "use_cases": [
    {
      "id": "uc-001",
      "titel": "Automatisch samenvatten van intakegesprekken",
      "afdeling": "Driessen Groep",
      "instuurder": "Team Recruitment",      // mag null zijn (geanonimiseerd)
      "tijdsbesparing_uren_per_week": 6,     // mag null zijn (nog niet ingeschat)
      "status": "Done",                      // Idee | In behandeling | Done | Geen AI
      "omschrijving": "…",
      "opmerkingen": "wordt meegenomen bij …"  // mag null zijn
    }
  ]
}
```

Bedrijven (in de code en de JSON heet dit veld `afdeling`): Driessen Groep, IJK,
Reijn, Haert, Bloeij, Brainport Human Campus, Driessen Foundation, Jeij, TSF,
Lüün, Programmamanagement, Overig.
Onbekende waarden voor `status` of `afdeling` vallen bij het inlezen terug op
`Idee` respectievelijk `Overig`, zodat een typefout de app niet breekt. Een kale
array in plaats van het object hierboven wordt ook geaccepteerd.

De dataset komt uit de AI-ideeën Excel van Driessen Groep, omgezet met
`scripts/converteer-excel.py`:

```bash
pip install openpyxl
python3 scripts/converteer-excel.py AIideeen.xlsx public/use-cases.json
```

Het script normaliseert de bedrijfsnamen, vult een lege status aan als `Idee` en
laat een besparing leeg als die niet eenduidig te herleiden is (`Onbekend`,
`1 tot 6`, `540 uur` zonder periode). Het rapporteert precies welke rijen dat
betreft, zodat je die handmatig kunt aanvullen — er wordt niets geschat.

> **Let op:** `instuurder` bevat de namen van collega's en deze site is publiek.
> Overweeg de namen te anonimiseren (het veld mag `null` zijn) of de repository
> op private te zetten voordat je breed deelt.

### `use-cases.json` bijwerken

1. Open de tool en vul besparing en status in bij de regels in de lijst, of voeg use cases
   toe met **+ Nieuwe use case**. Wijzigingen blijven in je browsersessie; de app
   zegt dat er ook bij.
2. Klik op **Exporteer bijgewerkte JSON** en kies downloaden of kopiëren naar het
   klembord.
3. Vervang `public/use-cases.json` in de repository door dat bestand en commit
   naar `main`.
4. De Actions-workflow bouwt en publiceert automatisch; daarna ziet iedereen de
   nieuwe stand.

---

## Uren-logica en configuratie

De brondata is besparing **per week**, het doel is **10.000 uur per jaar**:

```
uren_per_jaar = tijdsbesparing_uren_per_week × werkweken
```

Alles staat in **`src/config.ts`**:

| Waarde | Default | Betekenis |
| --- | --- | --- |
| `jaardoelUren` | `10000` | Bij deze waarde is de buis vol. |
| `werkwekenPerJaar` | `46` | Omrekenfactor week → jaar. |
| `telModus` | `'alleen-done'` | `'alleen-done'` telt alleen status `Done` in de meter; `'alle-statussen'` telt alles behalve `Geen AI` mee. |
| `gerealiseerdeStatussen` | `['Done']` | Wat als gerealiseerd geldt. |
| `potentieleStatussen` | `['Idee', 'In behandeling']` | Wat als potentieel geldt. |

Elke waarde is bij de build te overschrijven met een env-variabele, handig om
een scenario te publiceren zonder de code aan te passen:

```bash
VITE_WERKWEKEN=48 VITE_TELMODUS=alle-statussen npm run build
```

In de tool zelf zitten werkweken en telmodus ook onder **Rekeninstellingen**.
Dat past alleen de huidige sessie aan; de startwaarden komen uit de config.

De meter volgt het **afdelingsfilter** (zo zie je de bijdrage van één label),
maar niet het statusfilter — welke statussen meetellen bepaalt de telmodus.

---

## Deploy naar GitHub Pages

`.github/workflows/deploy.yml` draait bij elke push naar `main` en is ook
handmatig te starten (**Actions → Deploy naar GitHub Pages → Run workflow**),
bijvoorbeeld na het bijwerken van `use-cases.json`.

Eenmalig instellen: **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

De workflow zet `BASE_PATH` op `/<reponaam>/`, dus na hernoemen van de
repository blijft de deploy kloppen. Bij een eigen domein zet je `BASE_PATH: /`.

---

## Projectstructuur

```
public/use-cases.json          bronbestand met alle use cases
humain-urenmikker.html         losse visuele referentie (één bestand, geen build)
src/
  config.ts                    jaardoel, werkweken, telmodus
  types.ts                     UseCase, Status, Afdeling
  data/
    dataStore.ts               de interface waar alles doorheen gaat
    jsonDataStore.ts           terugval: JSON + in-memory, zonder database
    buddyDataStore.ts          de echte opslag: Buddy Data
    buddyClient.ts             inloggen en praten met de data-API
    index.ts                   createDataStore(): kiest de implementatie
  hooks/useUseCases.ts         enige koppeling tussen UI en dataStore
  lib/
    uren.ts                    week → jaar, totalen, segmenten voor de buis
    knikkers.ts                geometrie van buis en knikkers
    exporteer.ts               dataset → geldige use-cases.json
    format.ts                  Nederlandse getalnotatie
  components/                  Buis, Teller, use case-lijst, filters, modals
  styles/app.css               huisstijltokens en layout
```

---

## Data-laag: Buddy Data, met JSON als terugval

De hele app praat via één interface (`src/data/dataStore.ts`) en nooit
rechtstreeks met een bestand of een API:

```ts
interface DataStore {
  readonly naam: string;
  readonly persistent: boolean;      // false = alleen deze browsersessie
  getAll(): Promise<UseCase[]>;
  add(useCase: NieuweUseCase): Promise<UseCase>;
  update(id: string, patch: UseCasePatch): Promise<UseCase>;
}
```

Er zijn twee implementaties, en `createDataStore()` kiest op basis van de
omgevingsvariabelen:

- **`BuddyDataStore`** — de use cases staan in Buddy Data. Wijzigingen blijven
  bestaan en collega's zien ze meteen. Actief zodra `VITE_BUDDY_URL`,
  `VITE_BUDDY_DATA_URL` en `VITE_BUDDY_PROJECT` gezet zijn.
- **`JsonDataStore`** — leest `use-cases.json` en houdt wijzigingen in het
  geheugen. Handig voor een demo of een omgeving zonder Buddy; `persistent` staat
  dan op `false` en de UI meldt dat er niets bewaard wordt.

### Inloggen

De medewerker logt in met zijn **Driessen-werkaccount**. Er is geen apart account
voor deze app en er staat geen sleutel in de code; wie in dienst komt kan meteen
inloggen.

Dat gaat in twee stappen:

1. `entraLogin.ts` laat MSAL de gebruiker inloggen bij Microsoft en levert een
   ID-token. Op een werklaptop merk je hier meestal niets van — je bent al
   ingelogd.
2. `buddyClient.ts` ruilt dat token bij Buddy in voor een token dat de database
   begrijpt (`grant_type=urn:ietf:params:oauth:grant-type:token-exchange`).

Waarom twee tokens: Microsoft zegt wíe je bent, maar Postgres kent Microsoft
niet. Het Buddy-token zegt welke rol je in de database krijgt.

Buddy controleert het Microsoft-token op handtekening, tenant en audience. Het
adres van deze app moet als redirect-URI in de Entra-app-registratie staan,
anders weigert Microsoft de omleiding.

### De tabel

`use_cases` is aangemaakt als **gedeeld**: elke ingelogde medewerker leest en
bewerkt dezelfde lijst. Dat past bij wat deze app is — een gezamenlijk overzicht
van de organisatie, geen persoonlijke lijst. Verwijderen kan bewust niet vanuit de
browser; dan zou één misklik het werk van een ander wegvagen.

### In gebruik nemen

```bash
cp .env.example .env          # vul de drie VITE_BUDDY_-waarden in

# eenmalig de bestaande use cases overzetten (met een rw-sleutel uit het beheerscherm)
BUDDY_CLIENT_ID=bd_... BUDDY_CLIENT_SECRET=... node scripts/importeer-naar-buddy.mjs
```

### Waar de app draait

Op twee plekken, allebei vanaf een push naar `main`:

| | adres | workflow |
|---|---|---|
| GitHub Pages | `driessengroep-prm.github.io/Humain-urenmikker/` | `deploy.yml` |
| Eigen subdomein | `urenmikker.driessengroep.nl` | `deploy-subdomein.yml` |

Twee keer bouwen, want Pages serveert onder `/Humain-urenmikker/` en het
subdomein onder `/`. Dat pad zit in de gebouwde bestanden.

Op het subdomein draait geen applicatie: Caddy serveert de bestanden uit
`/data/caddy/apps/urenmikker` op de buddy-production VM. Publiceren is die map
vervangen, meer niet.

Wat er eenmalig moet staan:

- een A-record `urenmikker.driessengroep.nl` → `40.115.59.118`
- het repository-secret `VM_SSH_KEY` — een privésleutel waarmee de workflow bij
  `buddy-admin@40.115.59.118` kan
- de repository-variabelen `ENTRA_CLIENT_ID` en `ENTRA_TENANT_ID`
- beide adressen als redirect-URI in de Entra-app-registratie

De `VITE_BUDDY_`-waarden staan vast in de workflows; geheimen zijn het niet.

Beide workflows controleren na het bouwen of de verbinding met Buddy Data
daadwerkelijk in de bundel zit. Zonder die controle publiceert een ontbrekende
variabele stilzwijgend de versie die `use-cases.json` leest — en dan merk je pas
weken later dat wijzigingen nergens heen gingen.

---

## Toegankelijkheid

- Zichtbare focusrand (terracotta) op alles wat bedienbaar is.
- Skiplink naar de use cases als eerste tabstop.
- Modals: focus-trap, sluiten met `Escape`, focus keert terug naar de knop die
  hem opende.
- De buis heeft een tekstalternatief met de actuele stand; een regel in de lijst
  licht de buis ook op bij toetsenbordfocus, niet alleen bij hover.
- `prefers-reduced-motion: reduce` zet de animaties uit.
- Werkt vanaf 320 px breed; geen horizontale scroll.
