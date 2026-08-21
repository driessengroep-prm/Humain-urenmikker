/** Alle statussen die een use case kan hebben. */
export const STATUSSEN = ['Idee', 'In behandeling', 'Done', 'Geen AI'] as const;
export type Status = (typeof STATUSSEN)[number];

/** Vaste lijst met afdelingen binnen Driessen Groep. */
export const AFDELINGEN = [
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
  'Programmamanagement',
  'Overig',
] as const;
export type Afdeling = (typeof AFDELINGEN)[number];

/**
 * Eén use case zoals die in use-cases.json staat.
 * `instuurder` en `tijdsbesparing_uren_per_week` zijn bewust nullable: een case
 * mag geanonimiseerd zijn en de besparing hoeft nog niet ingeschat te zijn.
 */
export interface UseCase {
  id: string;
  titel: string;
  afdeling: Afdeling;
  instuurder: string | null;
  tijdsbesparing_uren_per_week: number | null;
  status: Status;
  omschrijving: string;
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
  use_cases: UseCase[];
}

export function isStatus(waarde: unknown): waarde is Status {
  return typeof waarde === 'string' && (STATUSSEN as readonly string[]).includes(waarde);
}

export function isAfdeling(waarde: unknown): waarde is Afdeling {
  return typeof waarde === 'string' && (AFDELINGEN as readonly string[]).includes(waarde);
}
