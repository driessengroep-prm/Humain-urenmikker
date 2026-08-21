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
      "omschrijving": "…"
    }
  ]
}
```

Afdelingen: Driessen Groep, IJK, Reijn, Haert, Bloeij, Brainport Human Campus,
Driessen Foundation, Jeij, TSF, Lüün, Programmamanagement, Overig.
Onbekende waarden voor `status` of `afdeling` vallen bij het inlezen terug op
`Idee` respectievelijk `Overig`, zodat een typefout de app niet breekt. Een kale
array in plaats van het object hierboven wordt ook geaccepteerd.

> **Let op:** de meegeleverde dataset is voorbeeldmateriaal. Vervang hem door de
> echte export uit de Excel voordat de tool intern gedeeld wordt.

### `use-cases.json` bijwerken

1. Open de tool en vul besparing en status in bij de kaarten, of voeg use cases
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
    jsonDataStore.ts           huidige implementatie: JSON + in-memory
    supabaseDataStore.ts.voorbeeld   blauwdruk voor later
    index.ts                   createDataStore(): kiest de implementatie
  hooks/useUseCases.ts         enige koppeling tussen UI en dataStore
  lib/
    uren.ts                    week → jaar, totalen, segmenten voor de buis
    knikkers.ts                geometrie van buis en knikkers
    exporteer.ts               dataset → geldige use-cases.json
    format.ts                  Nederlandse getalnotatie
  components/                  Buis, Teller, kaarten, filters, modals
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
- De buis heeft een tekstalternatief met de actuele stand; kaarten lichten de
  buis ook op bij toetsenbordfocus, niet alleen bij hover.
- `prefers-reduced-motion: reduce` zet de animaties uit.
- Werkt vanaf 320 px breed; geen horizontale scroll.
