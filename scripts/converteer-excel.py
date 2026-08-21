"""Zet de AI-ideeen Excel om naar public/use-cases.json.

Gebruik: python3 scripts/converteer-excel.py <bron.xlsx> [doel.json] [--anoniem]
Vereist: pip install openpyxl

De Excel blijft de bron van waarheid voor de namen; die staan niet in dit
script en niet in de repository. Met --anoniem komt `instuurder` overal op null
te staan en worden bekende namen uit de vrije tekst vervangen door [naam], voor
een publiek bereikbare site. Zonder de vlag komen de namen er gewoon in, voor
een intern gehoste versie. Draai het script opnieuw om te wisselen.

LET OP: het schonen van omschrijving en opmerkingen is best effort. Namen die
nergens als instuurder voorkomen worden niet herkend; loop die velden zelf na
voordat je een geanonimiseerde set publiceert.

Regels staan expliciet in dit script zodat de omzetting herhaalbaar en
controleerbaar is. Alles wat niet eenduidig te herleiden is wordt null en komt
in het rapport terecht - er wordt niets geschat.
"""
import json, re, sys
import openpyxl

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
ANONIEM = "--anoniem" in sys.argv

BRON = ARGS[0] if len(ARGS) > 0 else "AIideeen.xlsx"
DOEL = ARGS[1] if len(ARGS) > 1 else "public/use-cases.json"

# Schrijfwijzen uit de sheet -> (bedrijf, afdeling/team).
# De kolom in de sheet heet "Bedrijf/bedrijfsonderdeel" en bevat allebei door
# elkaar; hier wordt dat uit elkaar getrokken.
BEDRIJVEN = {
    "driessen": ("Driessen", None),
    "driessen groep": ("Driessen Groep", None),
    "driessen groep en ijk": ("Driessen Groep", None),  # staat op twee bedrijven; zie rapport
    "ijk": ("IJK", None),
    "bhc": ("Brainport Human Campus", None),
    "bloeij": ("Bloeij", None),
    "reijn": ("Reijn", None),
    "haert": ("Haert", None),
    "jeij": ("Jeij", None),
    "tsf": ("TSF", None),
    "driessen foundation": ("Driessen Foundation", None),
    "lüün": ("Lüün", None),
    # Geen werkmaatschappij maar een team binnen Driessen Groep.
    "programmamanagement": ("Driessen Groep", "Programmamanagement"),
}

# "Geen AI" bestaat niet meer als status; die rijen worden een idee.
STATUSSEN = {"idee": "Idee", "in behandeling": "In behandeling",
             "done": "Done", "geen ai": "Idee"}

# Namen die in omschrijving of opmerkingen voorkomen maar nergens als instuurder,
# en daarom niet automatisch gevonden worden. Met de hand aanvullen na controle.
# Let op: neem hier geen productnamen in op.
EXTRA_NAMEN = {
    "Ad",
    "Hans",
    "Johnny",
    "Jessie",
    "Jessi",
    "Inger",
    "Ruud",
    "Jeroen",
    "Chantal",
    "Tim",
}

# Woorden die op een naam lijken maar het niet zijn: producten, tools, merken.
# Deze blijven staan, ook als ze toevallig gelijk zijn aan de naam van een collega.
GEEN_NAMEN = {"Vera"}

# Boven deze grens is een besparing per week niet aannemelijk voor één use case.
GRENS_UREN_PER_WEEK = 100

rapport = {"uren_leeggelaten": [], "status_aangevuld": [], "bedrijf_hernoemd": []}

def tekst(waarde):
    return str(waarde).strip() if waarde is not None and str(waarde).strip() else None

def parse_uren(waarde, nr, titel):
    ruw = tekst(waarde)
    if ruw is None:
        return None
    genormaliseerd = ruw.replace(",", ".")
    try:
        getal = float(genormaliseerd)
    except ValueError:
        match = re.fullmatch(r"([\d.]+)\s*uur per week", genormaliseerd, re.IGNORECASE)
        if match:
            return float(match.group(1))
        rapport["uren_leeggelaten"].append((nr, titel, ruw, "geen getal"))
        return None
    if getal > GRENS_UREN_PER_WEEK:
        rapport["uren_leeggelaten"].append((nr, titel, ruw, "onwaarschijnlijk hoog"))
        return None
    return int(getal) if getal == int(getal) else getal

def verwijder_namen(tekst, namen):
    """Vervangt bekende namen in vrije tekst door [naam]; best effort."""
    if not tekst:
        return tekst
    # Langste namen eerst, zodat "Chantal Scherders" niet op "Chantal" struikelt.
    for naam in sorted(namen, key=len, reverse=True):
        tekst = re.sub(rf"\b{re.escape(naam)}\b", "[naam]", tekst)
    return tekst


ws = openpyxl.load_workbook(BRON, data_only=True)["Blad1"]
rijen = [r for r in ws.iter_rows(min_row=3, values_only=True)
         if any(c is not None and str(c).strip() for c in r)]

# Volledige namen plus losse voor- en achternamen, voor het schonen van vrije tekst.
alle_namen = set()
for rij in rijen:
    naam = tekst(rij[2])
    if naam:
        alle_namen.add(naam)
        alle_namen.update(deel for deel in naam.replace(" en ", " ").split() if len(deel) > 3)
alle_namen |= EXTRA_NAMEN
alle_namen -= GEEN_NAMEN

use_cases = []
for index, rij in enumerate(rijen, start=1):
    nr, naam, instuurder, bedrijf, uren, status, beschrijving, opmerking = rij[:8]
    titel = tekst(naam) or "Zonder titel"

    ruw_bedrijf = tekst(bedrijf) or ""
    if ruw_bedrijf.lower() not in BEDRIJVEN:
        rapport.setdefault("bedrijf_onbekend", []).append((nr, ruw_bedrijf))
    net_bedrijf, net_team = BEDRIJVEN.get(ruw_bedrijf.lower(), ("Driessen Groep", None))
    if net_bedrijf.lower() != ruw_bedrijf.lower():
        rapport["bedrijf_hernoemd"].append((ruw_bedrijf, net_bedrijf, net_team))

    ruw_status = (tekst(status) or "").lower()
    if ruw_status in STATUSSEN:
        nette_status = STATUSSEN[ruw_status]
    else:
        nette_status = "Idee"
        rapport["status_aangevuld"].append((nr, titel))

    nummer = None
    if nr is not None and str(nr).strip().isdigit():
        nummer = int(str(nr).strip())
    else:
        rapport.setdefault("nummer_ontbreekt", []).append((index, titel))

    use_cases.append({
        # Het id volgt het nummer uit de sheet, zodat beide naar dezelfde rij wijzen.
        "id": f"uc-{nummer:03d}" if nummer is not None else f"uc-r{index:03d}",
        "nummer": nummer,
        "titel": titel,
        "bedrijf": net_bedrijf,
        "team": net_team,
        "instuurder": None if ANONIEM else tekst(instuurder),
        "tijdsbesparing_uren_per_week": parse_uren(uren, nr, titel),
        "status": nette_status,
        "omschrijving": (
            verwijder_namen(tekst(beschrijving), alle_namen) if ANONIEM else tekst(beschrijving)
        ) or "",
        "opmerkingen": (
            verwijder_namen(tekst(opmerking), alle_namen) if ANONIEM else tekst(opmerking)
        ),
    })

bestand = {
    "versie": 1,
    "bijgewerkt_op": "2026-08-21",
    "toelichting": (
        "Bron: AI-ideeën sheet van Driessen Groep. tijdsbesparing_uren_per_week is de "
        "geschatte besparing PER WEEK; de app rekent dit om naar uren per jaar met het "
        "aantal werkweken uit src/config.ts."
    ),
    "opmerking_fg": (
        "Algemene opmerking FG: houd er rekening mee dat de FG bij nagenoeg ieder traject "
        "actief betrokken moet zijn en dat de kans aannemelijk is dat voor het grootste deel "
        "van onderstaande een DPIA opgesteld moet worden."
    ),
    "use_cases": use_cases,
}

with open(DOEL, "w", encoding="utf-8") as f:
    json.dump(bestand, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"{len(use_cases)} use cases weggeschreven naar {DOEL}")
print("modus: ANONIEM (instuurder leeg, bekende namen uit vrije tekst)"
      if ANONIEM else "modus: met namen")
print()
ontbreekt = rapport.get("nummer_ontbreekt", [])
if ontbreekt:
    print(f"LET OP - geen nummer in kolom A bij {len(ontbreekt)} rijen: "
          + ", ".join(t[:30] for _, t in ontbreekt[:5]))
print(f"Status leeg -> Idee gezet: {len(rapport['status_aangevuld'])}")
print(f"Besparing niet overgenomen: {len(rapport['uren_leeggelaten'])}")
for nr, titel, ruw, reden in rapport["uren_leeggelaten"]:
    print(f"  nr {nr:>4} | {titel[:48]:50} | {ruw!r} ({reden})")
from collections import Counter
print("\nBedrijf hernoemd:", Counter(rapport["bedrijf_hernoemd"]).most_common())
onbekend = rapport.get("bedrijf_onbekend", [])
if onbekend:
    print("\nLET OP - bedrijf niet herkend, op Driessen Groep gezet:")
    for nr, waarde in onbekend:
        print(f"  nr {nr}: {waarde!r}  -> voeg een regel toe aan BEDRIJVEN in dit script")
