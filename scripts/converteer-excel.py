"""Zet de AI-ideeen Excel om naar public/use-cases.json.

Gebruik: python3 scripts/converteer-excel.py <bron.xlsx> [doel.json]
Vereist: pip install openpyxl

Regels staan expliciet in dit script zodat de omzetting herhaalbaar en
controleerbaar is. Alles wat niet eenduidig te herleiden is wordt null en komt
in het rapport terecht - er wordt niets geschat.
"""
import json, re, sys
import openpyxl

BRON = sys.argv[1] if len(sys.argv) > 1 else "AIideeen.xlsx"
DOEL = sys.argv[2] if len(sys.argv) > 2 else "public/use-cases.json"

# Schrijfwijzen uit de sheet -> de vaste bedrijvenlijst van de tool.
BEDRIJVEN = {
    "driessen": "Driessen Groep",
    "driessen groep": "Driessen Groep",
    "driessen groep en ijk": "Driessen Groep",   # staat op twee bedrijven; zie rapport
    "ijk": "IJK",
    "bhc": "Brainport Human Campus",
    "bloeij": "Bloeij",
    "reijn": "Reijn",
    "haert": "Haert",
    "jeij": "Jeij",
    "tsf": "TSF",
    "driessen foundation": "Driessen Foundation",
    "lüün": "Lüün",
    "programmamanagement": "Programmamanagement",
}

STATUSSEN = {"idee": "Idee", "in behandeling": "In behandeling",
             "done": "Done", "geen ai": "Geen AI"}

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

ws = openpyxl.load_workbook(BRON, data_only=True)["Blad1"]
rijen = [r for r in ws.iter_rows(min_row=3, values_only=True)
         if any(c is not None and str(c).strip() for c in r)]

use_cases = []
for index, rij in enumerate(rijen, start=1):
    nr, naam, instuurder, bedrijf, uren, status, beschrijving, opmerking = rij[:8]
    titel = tekst(naam) or "Zonder titel"

    ruw_bedrijf = tekst(bedrijf) or ""
    afdeling = BEDRIJVEN.get(ruw_bedrijf.lower(), "Overig")
    if afdeling.lower() != ruw_bedrijf.lower():
        rapport["bedrijf_hernoemd"].append((ruw_bedrijf, afdeling))

    ruw_status = (tekst(status) or "").lower()
    if ruw_status in STATUSSEN:
        nette_status = STATUSSEN[ruw_status]
    else:
        nette_status = "Idee"
        rapport["status_aangevuld"].append((nr, titel))

    use_cases.append({
        "id": f"uc-{index:03d}",
        "titel": titel,
        "afdeling": afdeling,
        "instuurder": tekst(instuurder),
        "tijdsbesparing_uren_per_week": parse_uren(uren, nr, titel),
        "status": nette_status,
        "omschrijving": tekst(beschrijving) or "",
        "opmerkingen": tekst(opmerking),
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

print(f"{len(use_cases)} use cases weggeschreven naar {DOEL}\n")
print(f"Status leeg -> Idee gezet: {len(rapport['status_aangevuld'])}")
print(f"Besparing niet overgenomen: {len(rapport['uren_leeggelaten'])}")
for nr, titel, ruw, reden in rapport["uren_leeggelaten"]:
    print(f"  nr {nr:>4} | {titel[:48]:50} | {ruw!r} ({reden})")
from collections import Counter
print("\nBedrijf hernoemd:", Counter(rapport["bedrijf_hernoemd"]).most_common())
