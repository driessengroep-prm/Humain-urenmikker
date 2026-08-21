/** Alle statussen die een use case kan hebben. */
export const STATUSSEN = ['Idee', 'In behandeling', 'Done', 'Geen AI'] as const;
export type Status = (typeof STATUSSEN)[number];

/**
 * De werkmaatschappijen binnen Driessen Groep.
 * Let op: een afdeling of team (bijvoorbeeld Programmamanagement) hoort niet in
 * deze lijst maar in het losse veld `team`.
 */
export const BEDRIJVEN = [
  'Driessen',
  'Driessen Groep',
  'IJK',
  'Reijn',
  'Haert',
  'Bloeij',
  'Brainport Human Campus',
  'Driessen Foundation',
  'Jeij',
  'TSF',
  'Lüün',
] as const;
export type Bedrijf = (typeof BEDRIJVEN)[number];

/**
 * Eén use case zoals die in use-cases.json staat.
 * `instuurder`, `team`, `tijdsbesparing_uren_per_week` en `opmerkingen` zijn
 * bewust nullable: een case mag geanonimiseerd zijn, hoeft niet aan een team te
 * hangen en de besparing hoeft nog niet ingeschat te zijn.
 */
export interface UseCase {
  id: string;
  titel: string;
  bedrijf: Bedrijf;
  /** Afdeling of team binnen het bedrijf, vrije tekst. */
  team: string | null;
  instuurder: string | null;
  tijdsbesparing_uren_per_week: number | null;
  status: Status;
  omschrijving: string;
  /** Vrije notitie uit de bronsheet (bijv. "wordt meegenomen bij integratie X"). */
  opmerkingen: string | null;
}

/** Velden die de gebruiker opgeeft bij een nieuwe use case; het id komt uit de dataStore. */
export type NieuweUseCase = Omit<UseCase, 'id'>;

/** Deelupdate van een bestaande use case. */
export type UseCasePatch = Partial<NieuweUseCase>;

/** Het formaat van use-cases.json. */
export interface UseCasesBestand {
  versie: number;
  bijgewerkt_op: string;
  toelichting?: string;
  /** Notitie van de Functionaris Gegevensbescherming bij de hele lijst. */
  opmerking_fg?: string;
  use_cases: UseCase[];
}

export function isStatus(waarde: unknown): waarde is Status {
  return typeof waarde === 'string' && (STATUSSEN as readonly string[]).includes(waarde);
}

export function isBedrijf(waarde: unknown): waarde is Bedrijf {
  return typeof waarde === 'string' && (BEDRIJVEN as readonly string[]).includes(waarde);
}
