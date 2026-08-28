import { isAfdeling, isStatus } from '../types';
import type { NieuweUseCase, UseCase, UseCasePatch } from '../types';
import { BuddyClient, type BuddyConfig } from './buddyClient';
import { UseCaseNietGevondenError, type DataStore } from './dataStore';

/**
 * DataStore die de use cases in Buddy Data bewaart.
 *
 * Anders dan de JsonDataStore blijven wijzigingen hier bestaan en zien alle collega's ze meteen:
 * de tabel is aangemaakt als "gedeeld", dus elke ingelogde medewerker leest en bewerkt dezelfde
 * lijst. Verwijderen kan bewust niet — dat zou betekenen dat één misklik het werk van een ander
 * wegvaagt.
 */
export class BuddyDataStore implements DataStore {
  readonly naam = 'Buddy Data';
  readonly persistent = true;

  private readonly client: BuddyClient;

  constructor(config: BuddyConfig, private readonly tabel = 'use_cases') {
    this.client = new BuddyClient(config);
  }

  async getAll(): Promise<UseCase[]> {
    const rijen = await this.client.run<BuddyRij>({
      operation: 'select',
      table: this.tabel,
      order: 'created_at.desc',
      limit: 1000,
    });

    return rijen.map(naarUseCase);
  }

  async add(nieuwe: NieuweUseCase): Promise<UseCase> {
    const [rij] = await this.client.run<BuddyRij>({
      operation: 'insert',
      table: this.tabel,
      values: naarRij(nieuwe),
    });

    return naarUseCase(rij);
  }

  async update(id: string, patch: UseCasePatch): Promise<UseCase> {
    const rijen = await this.client.run<BuddyRij>({
      operation: 'update',
      table: this.tabel,
      filters: [{ column: 'id', operator: 'eq', value: id }],
      values: naarRij(patch),
    });

    // Een lege uitkomst betekent hier "geen rij met dit id"; de API geeft daar geen 404 voor.
    if (rijen.length === 0) throw new UseCaseNietGevondenError(id);

    return naarUseCase(rijen[0]);
  }
}

/** Eén rij zoals de database hem teruggeeft. */
interface BuddyRij {
  id: string;
  titel: string;
  afdeling: string;
  instuurder: string | null;
  tijdsbesparing_uren_per_week: number | string | null;
  status: string;
  omschrijving: string;
  opmerkingen: string | null;
}

function naarUseCase(rij: BuddyRij): UseCase {
  // Postgres levert een decimaal getal als tekst, om precisie niet stilzwijgend te verliezen. Voor
  // een urenschatting is dat geen bezwaar, maar het moet hier wel een getal worden.
  const uren = rij.tijdsbesparing_uren_per_week;
  const urenGetal = uren === null ? null : Number(uren);

  return {
    id: rij.id,
    titel: rij.titel,
    afdeling: isAfdeling(rij.afdeling) ? rij.afdeling : 'Overig',
    instuurder: rij.instuurder,
    tijdsbesparing_uren_per_week:
      urenGetal !== null && Number.isFinite(urenGetal) ? urenGetal : null,
    status: isStatus(rij.status) ? rij.status : 'Idee',
    omschrijving: rij.omschrijving ?? '',
    opmerkingen: rij.opmerkingen,
  };
}

/** Alleen de velden die daadwerkelijk meegegeven zijn, zodat een patch geen kolommen leegmaakt. */
function naarRij(waarden: UseCasePatch): Record<string, unknown> {
  const rij: Record<string, unknown> = {};

  if (waarden.titel !== undefined) rij.titel = waarden.titel;
  if (waarden.afdeling !== undefined) rij.afdeling = waarden.afdeling;
  if (waarden.instuurder !== undefined) rij.instuurder = waarden.instuurder;
  if (waarden.tijdsbesparing_uren_per_week !== undefined) {
    rij.tijdsbesparing_uren_per_week = waarden.tijdsbesparing_uren_per_week;
  }
  if (waarden.status !== undefined) rij.status = waarden.status;
  if (waarden.omschrijving !== undefined) rij.omschrijving = waarden.omschrijving;
  if (waarden.opmerkingen !== undefined) rij.opmerkingen = waarden.opmerkingen;

  return rij;
}
