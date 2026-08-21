import type { UseCase, UseCasesBestand } from '../types';

/** Bouwt de inhoud van een geldige use-cases.json uit de huidige dataset. */
/**
 * Vaste notitie van de Functionaris Gegevensbescherming uit de bronsheet. Staat
 * hier zodat hij bij een export niet uit het bestand verdwijnt.
 */
const OPMERKING_FG =
  'Algemene opmerking FG: houd er rekening mee dat de FG bij nagenoeg ieder traject actief betrokken moet zijn en dat de kans aannemelijk is dat voor het grootste deel van onderstaande een DPIA opgesteld moet worden.';

export function bouwBestand(useCases: UseCase[]): UseCasesBestand {
  return {
    versie: 1,
    bijgewerkt_op: new Date().toISOString().slice(0, 10),
    toelichting:
      'Bronbestand voor de HUMAIN Urenmikker. tijdsbesparing_uren_per_week is de geschatte besparing PER WEEK; de app rekent dit om naar uren per jaar met het aantal werkweken uit src/config.ts.',
    opmerking_fg: OPMERKING_FG,
    use_cases: useCases.map((useCase) => ({
      id: useCase.id,
      nummer: useCase.nummer,
      titel: useCase.titel,
      bedrijf: useCase.bedrijf,
      team: useCase.team,
      instuurder: useCase.instuurder,
      tijdsbesparing_uren_per_week: useCase.tijdsbesparing_uren_per_week,
      status: useCase.status,
      omschrijving: useCase.omschrijving,
      opmerkingen: useCase.opmerkingen,
    })),
  };
}

export function alsJson(useCases: UseCase[]): string {
  return `${JSON.stringify(bouwBestand(useCases), null, 2)}\n`;
}

/** Start een download van use-cases.json in de browser. */
export function downloadJson(useCases: UseCase[]): void {
  const blob = new Blob([alsJson(useCases)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'use-cases.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Kopieert de JSON naar het klembord; geeft false als dat niet lukt. */
export async function kopieerJson(useCases: UseCase[]): Promise<boolean> {
  const tekst = alsJson(useCases);
  try {
    await navigator.clipboard.writeText(tekst);
    return true;
  } catch {
    return false;
  }
}
