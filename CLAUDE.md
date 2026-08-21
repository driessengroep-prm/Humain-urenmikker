# CLAUDE.md — werkafspraken voor deze repository

Context en conventies voor wie (of wat) hier verder bouwt. Zie `README.md` voor
setup en deploy.

## Wat dit is

Statische tool die de AI-tijdsbesparing van Driessen Groep optelt richting
10.000 uur per jaar, gevisualiseerd als een glazen buis die zich met gouden
knikkers vult. Geen backend, geen login: alle data komt uit
`public/use-cases.json`.

## Harde regels

1. **Alles loopt via de dataStore.** Componenten en hooks importeren nooit
   `use-cases.json` en doen nooit zelf een `fetch`. De enige toegang is
   `src/data/dataStore.ts` (`getAll` / `add` / `update`), via
   `createDataStore()` en de hook `useUseCases`. Dit is de reden dat Supabase er
   later in te schuiven is zonder de UI aan te raken — breek het niet.
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
6. **Nullable blijft nullable.** `instuurder`, `team`, `opmerkingen` en
   `tijdsbesparing_uren_per_week` mogen `null` zijn; toon dat als "anoniem
   ingestuurd" en "nog niet ingevuld" in plaats van als 0.
7. **Wijzigingen zijn niet persistent.** Zolang `dataStore.persistent === false`
   moet de UI eerlijk melden dat wijzigingen alleen in deze sessie bestaan, en
   moet de export een geldige `use-cases.json` opleveren.

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
cirkels uit de "d" van het logo, pill-vormige knoppen. De letters "AI" in
HUMAIN zijn altijd gemarkeerd. Kleuren staan als CSS-custom-properties boven in
`src/styles/app.css`; gebruik die tokens en geen losse hex-waarden.

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
- De use cases staan in een lijst met kolommen (use case, instuurder, bedrijf,
  afdeling/team, tijdsbesparing, status). Kopregel en regels delen één rasterdefinitie via
  `--lijst-kolommen` op `.lijst-blok`; wijzig je een kolom, pas dan die ene
  variabele aan. Onder 1080 px klapt een regel om naar een blokje en worden de
  kolomnamen per veld zichtbaar (`.rij__label`).
- Responsive vanaf 320 px, geen horizontale scroll. Let bij rasters op
  `min-width: 0` en `minmax(min(…, 100%), 1fr)`: lange woorden duwen anders de
  kolom breder dan het scherm.
- `npm run build` (tsc strict + Vite) moet slagen voordat je commit.

## Werkwijze

- Kleine, reviewbare commits met een Nederlandse beschrijving.
- Bij een wijziging in het datamodel: `src/types.ts`, de parser in
  `jsonDataStore.ts`, de export in `lib/exporteer.ts` en het voorbeeld in
  `supabaseDataStore.ts.voorbeeld` samen bijwerken.
- De dataset komt uit de AI-ideeën Excel en wordt gegenereerd met
  `scripts/converteer-excel.py`. Werk de sheet bij en draai het script opnieuw
  in plaats van `use-cases.json` handmatig te redigeren; de mappingregels
  (bedrijfsnamen, lege status, onherleidbare besparing) staan in dat script.
- `instuurder` bevat echte namen en de site is publiek. Anonimiseren kan door
  het veld op `null` te zetten; de UI toont dan "anoniem ingestuurd".

## Wat er nog niet is

- Supabase: opslag, login en rechten per eigenaar. De blauwdruk staat in
  `src/data/supabaseDataStore.ts.voorbeeld` en het stappenplan in de README.
- Geen datumveld op een use case. "Nieuwste eerst" gebruikt nu de volgorde van
  de dataStore (nieuw toegevoegd staat vooraan). Komt er een
  `aangemaakt_op`-veld, sorteer daar dan op.
- Geen geautomatiseerde tests.
