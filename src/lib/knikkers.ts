/**
 * Geometrie van de buis en de knikkers.
 *
 * De knikkers liggen in een hexagonale stapeling (rijen van 4 en 3) en worden
 * van onder naar boven genummerd. Knikker i vertegenwoordigt het urenbereik
 * [i/N * jaardoel, (i+1)/N * jaardoel), zodat een use case-segment exact op
 * knikkers te leggen is.
 */

export const buis = {
  viewBoxBreedte: 220,
  viewBoxHoogte: 540,
  /** Buitenkant van het glas. */
  x: 48,
  y: 28,
  breedte: 96,
  hoogte: 480,
  wand: 6,
  /** Bovenkant is een halve cirkel, de bodem is nauwelijks afgerond. */
  bodemRadius: 16,
  /** Onder- en bovenkant van de vulruimte. */
  vulTop: 36,
  vulBodem: 500,
} as const;

/**
 * Contour van de buis: halfronde bovenkant (de boog uit het logo) en een vlakke
 * bodem waar de knikkers netjes op blijven liggen. `inzet` maakt het pad kleiner
 * voor de glaswand en het clippad.
 */
export function buisPad(inzet = 0): string {
  const x = buis.x + inzet;
  const y = buis.y + inzet;
  const b = buis.breedte - inzet * 2;
  const h = buis.hoogte - inzet * 2;
  const rTop = b / 2;
  const rBodem = Math.max(buis.bodemRadius - inzet, 2);
  return [
    `M ${x} ${y + rTop}`,
    `A ${rTop} ${rTop} 0 0 1 ${x + b} ${y + rTop}`,
    `L ${x + b} ${y + h - rBodem}`,
    `A ${rBodem} ${rBodem} 0 0 1 ${x + b - rBodem} ${y + h}`,
    `L ${x + rBodem} ${y + h}`,
    `A ${rBodem} ${rBodem} 0 0 1 ${x} ${y + h - rBodem}`,
    'Z',
  ].join(' ');
}

export const knikkerStraal = 8;
const horizontaleAfstand = 17.5;
const verticaleAfstand = 13.6;

export interface Knikker {
  index: number;
  cx: number;
  cy: number;
  /** Onderkant van het urenbereik dat deze knikker voorstelt. */
  vanUren: number;
  totUren: number;
}

function bouwPosities(): Array<{ cx: number; cy: number }> {
  const midden = buis.x + buis.breedte / 2;
  const onderste = buis.vulBodem - knikkerStraal;
  const bovenste = buis.vulTop + knikkerStraal;
  const posities: Array<{ cx: number; cy: number }> = [];

  for (let rij = 0; ; rij += 1) {
    const cy = onderste - rij * verticaleAfstand;
    if (cy < bovenste) break;
    const offsets =
      rij % 2 === 0
        ? [-1.5, -0.5, 0.5, 1.5].map((f) => f * horizontaleAfstand)
        : [-1, 0, 1].map((f) => f * horizontaleAfstand);
    for (const offset of offsets) {
      posities.push({ cx: midden + offset, cy });
    }
  }

  return posities;
}

const posities = bouwPosities();

/** Totaal aantal knikkers waarmee de buis gevuld kan worden. */
export const aantalKnikkers = posities.length;

/** Bouwt de knikkerlijst voor een gegeven jaardoel. */
export function maakKnikkers(jaardoel: number): Knikker[] {
  const perKnikker = jaardoel / aantalKnikkers;
  return posities.map((positie, index) => ({
    index,
    cx: positie.cx,
    cy: positie.cy,
    vanUren: index * perKnikker,
    totUren: (index + 1) * perKnikker,
  }));
}

/** Zet een urenwaarde om naar een y-coördinaat in de buis. */
export function yVoorUren(uren: number, jaardoel: number): number {
  const ratio = jaardoel > 0 ? Math.min(Math.max(uren / jaardoel, 0), 1) : 0;
  return buis.vulBodem - ratio * (buis.vulBodem - buis.vulTop);
}
