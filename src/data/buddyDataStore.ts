import { BEDRIJVEN, isBedrijf, isGevoeligeData, isStatus } from '../types';
import type { Bedrijf, NieuweUseCase, UseCase, UseCasePatch } from '../types';
import { volgendNummer } from '../lib/nummering';
import { BuddyClient, type BuddyConfig } from './buddyClient';
import { UseCaseNietGevondenError, type DataStore } from './dataStore';

/**
 * DataStore die de use cases in Buddy Data bewaart.
 *
 * Anders dan de JsonDataStore blijven wijzigingen hier bestaan en zien alle collega's ze meteen:
 * de tabel is aangemaakt als "gedeeld", dus elke ingelogde medewerker leest en bewerkt dezelfde
 * lijst.
 */
export class BuddyDataStore implements DataStore {
  readonly naam = 'Buddy Data';
  readonly persistent = true;

  private readonly client: BuddyClient;

  /**
   * Of de kolom `gevoelige_data` al in de tabel staat. Een kolom wordt niet vanzelf aangemaakt als
   * dit veld in de code verschijnt: dat gebeurt in het beheerscherm van Buddy. Zolang hij ontbreekt
   * blijft de rest van de tool gewoon werken en weigert alleen het opslaan van dit ene veld, met
   * een melding die zegt wat er moet gebeuren. Stilzwijgend weglaten zou erger zijn: dan lijkt het
   * opgeslagen en is het na een herlaadbeurt weg.
   *
   * null = nog niet vastgesteld; dat blijft zo tot er een rij langskomt.
   */
  private kolomAanwezig: boolean | null = null;

  constructor(config: BuddyConfig, private readonly tabel = 'use_cases') {
    this.client = new BuddyClient(config);
  }

  async getAll(): Promise<UseCase[]> {
    const rijen = await this.client.run<BuddyRij>({
      operation: 'select',
      table: this.tabel,
      // Verwijderde cases blijven in de tabel staan maar horen niet in beeld; zie verwijder().
      filters: [{ column: 'verwijderd', operator: 'eq', value: 'false' }],
      order: 'created_at.desc',
      limit: 1000,
    });

    // Een select haalt alle kolommen op, dus de eerste rij vertelt of het veld bestaat.
    if (rijen.length > 0) this.kolomAanwezig = 'gevoelige_data' in rijen[0];

    return rijen.map(naarUseCase);
  }

  async add(nieuwe: NieuweUseCase): Promise<UseCase> {
    /*
     * Het volgnummer wordt hier bepaald en niet in het formulier: alleen de
     * dataStore kent de hele lijst. Dat betekent één extra leesactie, maar de
     * lijst staat er toch al zodat het uit de cache van Buddy komt.
     */
    const nummer = nieuwe.nummer ?? volgendNummer(await this.getAll());

    const [rij] = await this.client.run<BuddyRij>({
      operation: 'insert',
      table: this.tabel,
      values: this.controleerKolom(naarRij({ ...nieuwe, nummer })),
    });

    return naarUseCase(rij);
  }

  async update(id: string, patch: UseCasePatch): Promise<UseCase> {
    const rijen = await this.client.run<BuddyRij>({
      operation: 'update',
      table: this.tabel,
      filters: [{ column: 'id', operator: 'eq', value: id }],
      values: this.controleerKolom(naarRij(patch)),
    });

    // Een lege uitkomst betekent hier "geen rij met dit id"; de API geeft daar geen 404 voor.
    if (rijen.length === 0) throw new UseCaseNietGevondenError(id);

    return naarUseCase(rijen[0]);
  }

  /**
   * Verwijderen kan vanuit de browser niet: op een gedeelde lijst zou één misklik het werk van een
   * ander wegvagen. In plaats daarvan verdwijnt de case uit beeld door hem als verwijderd te
   * merken; opruimen doet een beheerder.
   */
  async verwijder(id: string): Promise<void> {
    const rijen = await this.client.run<BuddyRij>({
      operation: 'update',
      table: this.tabel,
      filters: [{ column: 'id', operator: 'eq', value: id }],
      values: { verwijderd: true },
    });

    if (rijen.length === 0) throw new UseCaseNietGevondenError(id);
  }

  /**
   * Houdt tegen dat een antwoord op de vraag over gevoelige data in het niets verdwijnt zolang de
   * kolom nog niet bestaat. 'Onbekend' gaat er stilletjes af - dat is de stand die de database
   * zonder die kolom toch al teruggeeft, dus daar raakt niemand iets kwijt. Bij een echt antwoord
   * stopt het opslaan met een melding die zegt wat er moet gebeuren.
   */
  private controleerKolom(rij: Record<string, unknown>): Record<string, unknown> {
    if (this.kolomAanwezig !== false || !('gevoelige_data' in rij)) return rij;

    if (rij.gevoelige_data === 'Onbekend') {
      const { gevoelige_data: _weg, ...rest } = rij;
      return rest;
    }

    throw new Error(
      'De kolom "gevoelige_data" bestaat nog niet in Buddy Data, dus dit antwoord kan niet ' +
        'bewaard worden. Een beheerder voegt hem toe via Databases > urenmikker > Tabellen > ' +
        'use_cases > Kolom (tekst, standaardwaarde Onbekend).',
    );
  }
}

/** Eén rij zoals de database hem teruggeeft. */
interface BuddyRij {
  id: string;
  nummer: number | string | null;
  titel: string;
  bedrijf: string;
  team: string | null;
  instuurder: string | null;
  tijdsbesparing_uren_per_week: number | string | null;
  status: string;
  omschrijving: string;
  opmerkingen: string | null;
  gevoelige_data?: string | null;
}

function naarUseCase(rij: BuddyRij): UseCase {
  // Postgres levert een decimaal getal als tekst, om precisie niet stilzwijgend te verliezen. Voor
  // een urenschatting is dat geen bezwaar, maar het moet hier wel een getal worden.
  const uren = getal(rij.tijdsbesparing_uren_per_week);

  let bedrijf: Bedrijf;
  if (isBedrijf(rij.bedrijf)) {
    bedrijf = rij.bedrijf;
  } else {
    // Niet stilzwijgend ergens onderbrengen: melden en op het eerste bedrijf zetten.
    bedrijf = BEDRIJVEN[0];
    console.warn(`Onbekend bedrijf ${JSON.stringify(rij.bedrijf)} in use case ${rij.id}.`);
  }

  return {
    id: rij.id,
    nummer: getal(rij.nummer),
    titel: rij.titel,
    bedrijf,
    team: rij.team,
    instuurder: rij.instuurder,
    tijdsbesparing_uren_per_week: uren,
    status: isStatus(rij.status) ? rij.status : 'Idee',
    omschrijving: rij.omschrijving ?? '',
    opmerkingen: rij.opmerkingen,
    // Rijen van voor deze kolom hebben nog geen antwoord; dat is precies wat 'Onbekend' betekent.
    gevoelige_data: isGevoeligeData(rij.gevoelige_data) ? rij.gevoelige_data : 'Onbekend',
  };
}

function getal(waarde: number | string | null): number | null {
  if (waarde === null) return null;
  const getalWaarde = Number(waarde);
  return Number.isFinite(getalWaarde) ? getalWaarde : null;
}

/** Alleen de velden die daadwerkelijk meegegeven zijn, zodat een patch geen kolommen leegmaakt. */
function naarRij(waarden: UseCasePatch): Record<string, unknown> {
  const rij: Record<string, unknown> = {};

  if (waarden.nummer !== undefined) rij.nummer = waarden.nummer;
  if (waarden.titel !== undefined) rij.titel = waarden.titel;
  if (waarden.bedrijf !== undefined) rij.bedrijf = waarden.bedrijf;
  if (waarden.team !== undefined) rij.team = waarden.team;
  if (waarden.instuurder !== undefined) rij.instuurder = waarden.instuurder;
  if (waarden.tijdsbesparing_uren_per_week !== undefined) {
    rij.tijdsbesparing_uren_per_week = waarden.tijdsbesparing_uren_per_week;
  }
  if (waarden.status !== undefined) rij.status = waarden.status;
  if (waarden.omschrijving !== undefined) rij.omschrijving = waarden.omschrijving;
  if (waarden.opmerkingen !== undefined) rij.opmerkingen = waarden.opmerkingen;
  if (waarden.gevoelige_data !== undefined) rij.gevoelige_data = waarden.gevoelige_data;

  return rij;
}
