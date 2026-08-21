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
      "nummer": 1,                           // volgnummer uit kolom A van de sheet
      "titel": "Automatisch samenvatten van intakegesprekken",
      "bedrijf": "Driessen Groep",
      "team": "Programmamanagement",           // afdeling of team, mag null zijn
      "instuurder": "Team Recruitment",      // mag null zijn (geanonimiseerd)
      "tijdsbesparing_uren_per_week": 6,     // mag null zijn (nog niet ingeschat)
      "status": "Done",                      // Idee | In behandeling | Done
      "omschrijving": "…",
      "opmerkingen": "wordt meegenomen bij …"  // mag null zijn
    }
  ]
}
```

Bedrijven (veld `bedrijf`): Driessen, Driessen Groep, IJK, Reijn, Haert, Bloeij,
Brainport Human Campus, Driessen Foundation, Jeij, TSF, Lüün. Driessen en
Driessen Groep zijn twee aparte werkmaatschappijen; de bronsheet gebruikt beide
namen door elkaar en het conversiescript houdt ze uit elkaar. Een afdeling of team
binnen zo'n bedrijf hoort niet in die lijst maar in het vrije veld `team`
(bijvoorbeeld bedrijf `Driessen Groep` met team `Programmamanagement`).

Het oudere veld `afdeling` wordt bij het inlezen nog geaccepteerd als alias voor
`bedrijf`, zodat bestanden van voor deze wijziging blijven werken.
Een onbekende `status` valt bij het inlezen terug op `Idee`. Een onbekend
`bedrijf` komt op het eerste bedrijf uit de lijst te staan met een waarschuwing
in de console; het conversiescript meldt zulke waarden apart, zodat je er een
mapping voor toevoegt in plaats van dat ze stilzwijgend ergens belanden. Een kale
array in plaats van het object hierboven wordt ook geaccepteerd.

De dataset komt uit de AI-ideeën Excel van Driessen Groep, omgezet met
`scripts/converteer-excel.py`:

```bash
pip install openpyxl
python3 scripts/converteer-excel.py AIideeen.xlsx public/use-cases.json
```

Het `id` volgt het nummer uit kolom A (`nummer: 42` wordt `uc-042`), zodat een
regel in de tool en een regel in de sheet naar hetzelfde verwijzen. Het script
normaliseert de bedrijfsnamen, vult een lege status aan als `Idee` en
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
2. In diezelfde melding staat **Exporteer de bijgewerkte JSON**; kies daar
   downloaden of kopiëren naar het klembord.
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
| `telModus` | `'alleen-done'` | `'alleen-done'` telt alleen status `Done` in de meter; `'alle-statussen'` telt alle use cases mee. |
| `gerealiseerdeStatussen` | `['Done']` | Wat als gerealiseerd geldt. |
| `potentieleStatussen` | `['Idee', 'In behandeling']` | Wat als potentieel geldt. |

Elke waarde is bij de build te overschrijven met een env-variabele, handig om
een scenario te publiceren zonder de code aan te passen:

```bash
VITE_WERKWEKEN=48 VITE_TELMODUS=alle-statussen npm run build
```

In de tool zelf zitten werkweken en telmodus ook onder **Rekeninstellingen**.
Dat past alleen de huidige sessie aan; de startwaarden komen uit de config.

De meter volgt het **bedrijfs- en teamfilter** (zo zie je de bijdrage van één
label), maar niet het statusfilter — welke statussen meetellen bepaalt de
telmodus.

---

## Zelf bekijken zonder server

`npm run standalone` bouwt `dist/humain-urenmikker-standalone.html`: één bestand
met de opmaak, de code en de dataset erin. Dubbelklikken opent het in de browser,
zonder webserver en zonder Node. Handig zolang de repository private is (Pages
publiceert dan niet) en om de tool te delen met iemand zonder ontwikkelomgeving.

Toevoegen, wijzigen en exporteren werken er gewoon in; wijzigingen blijven zoals
altijd in de browsersessie. Wil je een versie met de namen erin, draai dan eerst
het conversiescript zonder `--anoniem` en daarna `npm run standalone`.

## Intern hosten

De build in `dist/` is een gewone statische site: zet de inhoud op een interne
webserver, IIS, een netwerkschijf met webtoegang of een SharePoint-bibliotheek.
Draait de site niet in de hoofdmap, geef dan het subpad mee:

```bash
BASE_PATH=/urenmikker/ npm run build
```

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
public/beeldmerk.png           HUMAIN-beeldmerk met Buddy, voor in de kop
humain-urenmikker.html         losse visuele referentie (één bestand, geen build)
src/
  config.ts                    jaardoel, werkweken, telmodus
  types.ts                     UseCase, Status, Afdeling
  data/
    dataStore.ts               de interface waar alles doorheen gaat
    jsonDataStore.ts           huidige implementatie: JSON + in-memory
    supabaseDataStore.ts.voorbeeld   blauwdruk voor later
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

## Data-laag: nu JSON, later Supabase

De hele app praat via één interface (`src/data/dataStore.ts`) en nooit
rechtstreeks met het JSON-bestand:

```ts
interface DataStore {
  readonly naam: string;
  readonly persistent: boolean;      // false = alleen deze browsersessie
  getAll(): Promise<UseCase[]>;
  add(useCase: NieuweUseCase): Promise<UseCase>;
  update(id: string, patch: UseCasePatch): Promise<UseCase>;
  verwijder(id: string): Promise<void>;
}
```

`JsonDataStore` leest `use-cases.json` één keer in en houdt wijzigingen in het
geheugen vast. Omdat er niets buiten de sessie wordt opgeslagen staat
`persistent` op `false`; daarop toont de UI de melding dat wijzigingen nog niet
gedeeld zijn.

**Overstappen naar Supabase** raakt de UI niet:

1. `npm install @supabase/supabase-js`.
2. Hernoem `src/data/supabaseDataStore.ts.voorbeeld` naar `.ts`. Daarin staan de
   tabeldefinitie, de row-level-security-policies voor rechten per eigenaar en
   de implementatie van dezelfde drie methodes.
3. Laat `createDataStore()` in `src/data/index.ts` de Supabase-variant
   teruggeven zodra `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` gezet zijn:

   ```ts
   export function createDataStore(): DataStore {
     const url = import.meta.env.VITE_SUPABASE_URL;
     const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
     return url && key ? new SupabaseDataStore(url, key) : new JsonDataStore();
   }
   ```

4. Zet de twee variabelen als repository-secrets en geef ze mee in de workflow.

Zodra `persistent` op `true` staat verdwijnt de melding over niet-opgeslagen
wijzigingen vanzelf. Login en rechten per eigenaar komen erbij als een
`auth`-laag om dezelfde store heen; de componenten blijven ongewijzigd.

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
