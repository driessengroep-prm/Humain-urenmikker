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
   `src/data/dataStore.ts` (`getAll` / `add` / `update` / `verwijder`), via
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
6. **Het invoerscherm eist titel, omschrijving, instuurder en tijdsbesparing.**
   Het urenveld is bewust geen `type="number"`: daar slikt de browser ongeldige
   tekens stil in en kan er geen melding verschijnen. Het is een tekstveld met
   eigen controle die cijfers en één decimaalteken toelaat en de rest weigert.
   Dat is er om invoer als "onbekend" of "1 tot 6" te voorkomen, precies wat in
   de bronsheet misging.
7. **Nullable blijft nullable.** `instuurder`, `team`, `opmerkingen` en
   `tijdsbesparing_uren_per_week` mogen `null` zijn; toon dat als "anoniem
   ingestuurd" en "nog niet ingevuld" in plaats van als 0.
8. **Wijzigingen zijn niet persistent.** Zolang `dataStore.persistent === false`
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
- Indeling van de pagina: bovenaan drie uitklapknoppen (gerealiseerde besparing,
  rekeninstellingen, besparing per bedrijf) met hun paneel eronder. Daaronder de
  band: de buis links, meescrollend, en rechts de filters met de use case-lijst.
  Elke knop toont zijn getal ook als het paneel dicht is.
- De use cases staan in een lijst met kolommen (nr, use case, instuurder,
  bedrijf, afdeling/team, tijdsbesparing, status). `nummer` is het volgnummer uit
  kolom A van de sheet en bepaalt ook het `id` (`uc-042`). Een case die in de
  tool wordt toegevoegd krijgt het eerstvolgende nummer; die toekenning hoort in
  de dataStore, want die kent de hele verzameling.
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
