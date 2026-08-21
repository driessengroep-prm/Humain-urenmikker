import type { TelModus } from '../config';

interface InstellingenProps {
  werkweken: number;
  telModus: TelModus;
  onWerkweken(waarde: number): void;
  onTelModus(waarde: TelModus): void;
}

/**
 * Werkweken en telmodus komen uit src/config.ts; hier zijn ze voor de huidige
 * sessie bij te stellen om scenario's te vergelijken.
 */
export function Instellingen({
  werkweken,
  telModus,
  onWerkweken,
  onTelModus,
}: InstellingenProps) {
  return (
    <section className="paneel" aria-labelledby="instellingen-titel">
      <h2 id="instellingen-titel" className="paneel__titel">
        Rekeninstellingen
      </h2>
      <div className="filters" style={{ margin: 0 }}>
        <div className="veld">
          <label className="veld__label" htmlFor="instelling-werkweken">
            Werkweken per jaar
          </label>
          <input
            id="instelling-werkweken"
            type="number"
            min="1"
            max="52"
            step="1"
            value={werkweken}
            onChange={(event) => {
              const waarde = Number(event.target.value);
              if (Number.isFinite(waarde) && waarde > 0 && waarde <= 52) onWerkweken(waarde);
            }}
            style={{ width: '110px' }}
          />
        </div>
        <div className="veld">
          <label className="veld__label" htmlFor="instelling-telmodus">
            Meter telt
          </label>
          <select
            id="instelling-telmodus"
            value={telModus}
            onChange={(event) => onTelModus(event.target.value as TelModus)}
          >
            <option value="alleen-done">Alleen gerealiseerd (Done)</option>
            <option value="alle-statussen">Alle statussen behalve Geen AI</option>
          </select>
        </div>
      </div>
    </section>
  );
}
