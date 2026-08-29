import { config } from '../config';
import type { Bedrijf, Status, UseCase } from '../types';

/** Rekent uren per week om naar uren per jaar met het ingestelde aantal werkweken. */
export function urenPerJaar(urenPerWeek: number | null | undefined, werkweken = config.werkwekenPerJaar): number {
  if (typeof urenPerWeek !== 'number' || !Number.isFinite(urenPerWeek)) return 0;
  return urenPerWeek * werkweken;
}

export function isGerealiseerd(status: Status): boolean {
  return (config.gerealiseerdeStatussen as readonly string[]).includes(status);
}

export function isPotentieel(status: Status): boolean {
  return (config.potentieleStatussen as readonly string[]).includes(status);
}

export interface Totalen {
  /** Uren per jaar die meetellen in de meter. */
  meetellendeUren: number;
  /** Uren per jaar met status Done. */
  gerealiseerdeUren: number;
  /** Uren per jaar van ideeën en trajecten in behandeling. */
  potentieleUren: number;
  /** Percentage van het jaardoel (0-100+, niet afgekapt). */
  percentage: number;
  /** Aantal use cases in de dataset (na filtering). */
  aantalUseCases: number;
  /** Aantal use cases zonder ingevulde besparing. */
  aantalZonderBesparing: number;
  /** Aantal bedrijven dat minstens één use case heeft. */
  aantalBedrijven: number;
}

export interface TelOpties {
  werkweken?: number;
  telModus?: typeof config.telModus;
  jaardoel?: number;
}

/** Bepaalt of een use case meetelt in de meter, gegeven de telmodus. */
export function teltMee(useCase: UseCase, telModus = config.telModus): boolean {
  if (telModus === 'alle-statussen') return true;
  return isGerealiseerd(useCase.status);
}

export function berekenTotalen(useCases: UseCase[], opties: TelOpties = {}): Totalen {
  const werkweken = opties.werkweken ?? config.werkwekenPerJaar;
  const telModus = opties.telModus ?? config.telModus;
  const jaardoel = opties.jaardoel ?? config.jaardoelUren;

  let meetellendeUren = 0;
  let gerealiseerdeUren = 0;
  let potentieleUren = 0;
  let aantalZonderBesparing = 0;
  const bedrijven = new Set<Bedrijf>();

  for (const useCase of useCases) {
    const uren = urenPerJaar(useCase.tijdsbesparing_uren_per_week, werkweken);
    bedrijven.add(useCase.bedrijf);
    if (useCase.tijdsbesparing_uren_per_week === null) aantalZonderBesparing += 1;
    if (isGerealiseerd(useCase.status)) gerealiseerdeUren += uren;
    if (isPotentieel(useCase.status)) potentieleUren += uren;
    if (teltMee(useCase, telModus)) meetellendeUren += uren;
  }

  return {
    meetellendeUren,
    gerealiseerdeUren,
    potentieleUren,
    percentage: jaardoel > 0 ? (meetellendeUren / jaardoel) * 100 : 0,
    aantalUseCases: useCases.length,
    aantalZonderBesparing,
    aantalBedrijven: bedrijven.size,
  };
}

export interface BedrijfTotaal {
  bedrijf: Bedrijf;
  aantal: number;
  meetellendeUren: number;
  gerealiseerdeUren: number;
  potentieleUren: number;
}

/** Besparing per bedrijf, gesorteerd op meetellende uren (aflopend). */
export function perBedrijf(useCases: UseCase[], opties: TelOpties = {}): BedrijfTotaal[] {
  const werkweken = opties.werkweken ?? config.werkwekenPerJaar;
  const telModus = opties.telModus ?? config.telModus;
  const map = new Map<Bedrijf, BedrijfTotaal>();

  for (const useCase of useCases) {
    const totaal = map.get(useCase.bedrijf) ?? {
      bedrijf: useCase.bedrijf,
      aantal: 0,
      meetellendeUren: 0,
      gerealiseerdeUren: 0,
      potentieleUren: 0,
    };
    const uren = urenPerJaar(useCase.tijdsbesparing_uren_per_week, werkweken);
    totaal.aantal += 1;
    if (isGerealiseerd(useCase.status)) totaal.gerealiseerdeUren += uren;
    if (isPotentieel(useCase.status)) totaal.potentieleUren += uren;
    if (teltMee(useCase, telModus)) totaal.meetellendeUren += uren;
    map.set(useCase.bedrijf, totaal);
  }

  return [...map.values()].sort(
    (a, b) => b.meetellendeUren - a.meetellendeUren || b.aantal - a.aantal,
  );
}

/**
 * Verdeelt de meetellende use cases over de buis: elke case krijgt een segment
 * [vanUren, totUren) in de meter. Zo weet de buis welk deel bij welke case hoort.
 */
export interface Segment {
  id: string;
  vanUren: number;
  totUren: number;
}

export function berekenSegmenten(useCases: UseCase[], opties: TelOpties = {}): Segment[] {
  const werkweken = opties.werkweken ?? config.werkwekenPerJaar;
  const telModus = opties.telModus ?? config.telModus;
  const segmenten: Segment[] = [];
  let cursor = 0;

  for (const useCase of useCases) {
    if (!teltMee(useCase, telModus)) continue;
    const uren = urenPerJaar(useCase.tijdsbesparing_uren_per_week, werkweken);
    if (uren <= 0) continue;
    segmenten.push({ id: useCase.id, vanUren: cursor, totUren: cursor + uren });
    cursor += uren;
  }

  return segmenten;
}
