import { config } from '../config';
import { BEDRIJVEN, isBedrijf, isStatus } from '../types';
import type { Bedrijf, NieuweUseCase, UseCase, UseCasePatch, UseCasesBestand } from '../types';
import { UseCaseNietGevondenError, type DataStore } from './dataStore';

/**
 * DataStore-implementatie zonder backend.
 *
 * Leest use-cases.json één keer in en houdt de dataset daarna in het geheugen
 * vast. Toevoegingen en wijzigingen leven dus alleen in de huidige browsersessie;
 * exporteren van de JSON is de manier om ze te delen.
 */
export class JsonDataStore implements DataStore {
  readonly naam = 'use-cases.json (in-memory)';
  readonly persistent = false;

  private useCases: UseCase[] | null = null;
  private laden: Promise<UseCase[]> | null = null;
  private volgnummer = 0;

  constructor(private readonly url: string = bronUrl()) {}

  async getAll(): Promise<UseCase[]> {
    const cases = await this.zorgVoorData();
    // Kopie teruggeven zodat de UI de interne lijst niet per ongeluk muteert.
    return cases.map((c) => ({ ...c }));
  }

  async add(nieuwe: NieuweUseCase): Promise<UseCase> {
    const cases = await this.zorgVoorData();
    const useCase: UseCase = { ...nieuwe, id: this.nieuwId() };
    cases.unshift(useCase);
    return { ...useCase };
  }

  async update(id: string, patch: UseCasePatch): Promise<UseCase> {
    const cases = await this.zorgVoorData();
    const index = cases.findIndex((c) => c.id === id);
    if (index === -1) throw new UseCaseNietGevondenError(id);
    const bijgewerkt: UseCase = { ...cases[index], ...patch, id };
    cases[index] = bijgewerkt;
    return { ...bijgewerkt };
  }

  private nieuwId(): string {
    this.volgnummer += 1;
    return `nieuw-${Date.now().toString(36)}-${this.volgnummer}`;
  }

  private zorgVoorData(): Promise<UseCase[]> {
    if (this.useCases) return Promise.resolve(this.useCases);
    this.laden ??= this.laadBestand();
    return this.laden;
  }

  private async laadBestand(): Promise<UseCase[]> {
    // In de standalone build zit de dataset al in de pagina; dan is er geen
    // fetch nodig (en die zou op een file://-URL toch geblokkeerd worden).
    const ingebouwd = (globalThis as { __URENMIKKER_DATA__?: unknown }).__URENMIKKER_DATA__;
    if (ingebouwd) {
      this.useCases = parseBestand(ingebouwd);
      return this.useCases;
    }
    const response = await fetch(this.url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Kon ${this.url} niet laden (HTTP ${response.status}).`);
    }
    const ruw: unknown = await response.json();
    this.useCases = parseBestand(ruw);
    return this.useCases;
  }
}

/** Bouwt de URL van het bronbestand, inclusief de base van GitHub Pages. */
function bronUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}${config.bronbestand}`;
}

/**
 * Accepteert zowel het volledige bestandsformaat als een kale array, zodat een
 * handmatig aangepast bestand niet meteen de hele app breekt.
 */
export function parseBestand(ruw: unknown): UseCase[] {
  const lijst: unknown = Array.isArray(ruw) ? ruw : (ruw as UseCasesBestand | null)?.use_cases;
  if (!Array.isArray(lijst)) {
    throw new Error('use-cases.json bevat geen lijst met use cases.');
  }
  return lijst.map(parseUseCase);
}

function parseUseCase(ruw: unknown, index: number): UseCase {
  const r = ruw as Record<string, unknown>;
  const status = isStatus(r.status) ? r.status : 'Idee';
  // `afdeling` is de oude veldnaam voor `bedrijf`; oudere bestanden blijven werken.
  const ruwBedrijf = r.bedrijf ?? r.afdeling;
  let bedrijf: Bedrijf;
  if (isBedrijf(ruwBedrijf)) {
    bedrijf = ruwBedrijf;
  } else {
    // Niet stilzwijgend ergens onderbrengen: melden en op het eerste bedrijf zetten.
    bedrijf = BEDRIJVEN[0];
    console.warn(`Onbekend bedrijf ${JSON.stringify(ruwBedrijf)} in use case ${r.id}.`);
  }
  const uren = r.tijdsbesparing_uren_per_week;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `uc-${index + 1}`,
    titel: typeof r.titel === 'string' ? r.titel : 'Zonder titel',
    bedrijf,
    team: typeof r.team === 'string' && r.team.trim() ? r.team.trim() : null,
    instuurder: typeof r.instuurder === 'string' && r.instuurder.trim() ? r.instuurder : null,
    tijdsbesparing_uren_per_week: typeof uren === 'number' && Number.isFinite(uren) ? uren : null,
    status,
    omschrijving: typeof r.omschrijving === 'string' ? r.omschrijving : '',
    opmerkingen:
      typeof r.opmerkingen === 'string' && r.opmerkingen.trim() ? r.opmerkingen : null,
  };
}
