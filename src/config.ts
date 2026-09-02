/**
 * Centrale configuratie van de Urenmikker.
 *
 * Alles wat met rekenen en tellen te maken heeft staat hier, zodat er geen
 * losse magische getallen door de UI zwerven. Waarden zijn te overschrijven met
 * env-variabelen bij de build (bijv. VITE_WERKWEKEN=48 npm run build).
 *
 * Deze waarden staan niet meer in de UI: de tool rekent altijd met het aantal
 * werkweken hieronder en telt alleen gerealiseerde use cases mee.
 */

/** Welke statussen tellen mee in de meter. */
export type TelModus = 'alleen-done' | 'alle-statussen';

function getal(waarde: string | undefined, fallback: number): number {
  const n = Number(waarde);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  /** Jaardoel in uren. De buis is vol bij deze waarde. */
  jaardoelUren: getal(import.meta.env.VITE_JAARDOEL_UREN, 10_000),

  /**
   * Aantal werkweken per jaar waarmee week -> jaar wordt gerekend.
   * uren_per_jaar = uren_per_week * werkweken
   */
  werkwekenPerJaar: getal(import.meta.env.VITE_WERKWEKEN, 50.8),

  /**
   * Standaard telt alleen gerealiseerde besparing (status = Done) mee in de meter.
   * Zet op 'alle-statussen' om ook ideeën en lopende trajecten mee te rekenen.
   * In de UI is dit ook per sessie om te zetten; deze waarde is de startstand.
   */
  telModus: (import.meta.env.VITE_TELMODUS === 'alle-statussen'
    ? 'alle-statussen'
    : 'alleen-done') as TelModus,

  /** Statussen die als 'gerealiseerd' gelden. */
  gerealiseerdeStatussen: ['Done'] as const,

  /** Statussen die als 'potentieel' gelden (nog niet gerealiseerd, wel kansrijk). */
  potentieleStatussen: ['Idee', 'In behandeling'] as const,

  /** Pad naar het bronbestand, relatief aan de basis-URL van de site. */
  bronbestand: 'use-cases.json',
} as const;
