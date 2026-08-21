import type { NieuweUseCase, UseCase, UseCasePatch } from '../types';

/**
 * De enige toegangspoort tot use case-data.
 *
 * De rest van de app praat uitsluitend via deze interface en nooit rechtstreeks
 * met use-cases.json. Wanneer Supabase erbij komt, wordt alleen een nieuwe
 * implementatie van deze interface geschreven (zie supabaseDataStore.ts.voorbeeld);
 * de UI hoeft dan niet te veranderen.
 */
export interface DataStore {
  /** Korte naam van de implementatie, voor in de UI en de export. */
  readonly naam: string;

  /**
   * Of wijzigingen ergens buiten deze browsersessie terechtkomen.
   * false = alleen in het geheugen (huidige JSON-implementatie).
   */
  readonly persistent: boolean;

  /** Alle use cases ophalen. */
  getAll(): Promise<UseCase[]>;

  /** Nieuwe use case toevoegen; geeft de aangemaakte case terug (inclusief id). */
  add(useCase: NieuweUseCase): Promise<UseCase>;

  /** Bestaande use case bijwerken; geeft de bijgewerkte case terug. */
  update(id: string, patch: UseCasePatch): Promise<UseCase>;
}

/** Fout die de dataStore gooit bij een onbekend id. */
export class UseCaseNietGevondenError extends Error {
  constructor(id: string) {
    super(`Use case met id "${id}" bestaat niet.`);
    this.name = 'UseCaseNietGevondenError';
  }
}
