import { getal } from '../lib/format';
import type { BedrijfTotaal } from '../lib/uren';

interface BedrijfOverzichtProps {
  totalen: BedrijfTotaal[];
}

export function BedrijfOverzicht({ totalen }: BedrijfOverzichtProps) {
  const maximum = Math.max(
    1,
    ...totalen.map((totaal) => totaal.meetellendeUren + totaal.potentieleUren),
  );

  return (
    <section className="paneel" aria-labelledby="bedrijven-titel">
      <h2 id="bedrijven-titel" className="paneel__titel">
        Besparing per bedrijf (uur/jaar)
      </h2>
      <div className="afdelingen">
        {totalen.map((totaal) => {
          const gerealiseerdBreedte = (totaal.meetellendeUren / maximum) * 100;
          const potentieelBreedte = (totaal.potentieleUren / maximum) * 100;
          return (
            <div className="afdeling" key={totaal.bedrijf}>
              <span className="afdeling__naam">{totaal.bedrijf}</span>
              <span className="afdeling__uren">{getal(totaal.meetellendeUren)}</span>
              <span className="afdeling__balk" aria-hidden="true">
                <i className="gerealiseerd" style={{ width: `${gerealiseerdBreedte}%` }} />
                <i className="potentieel" style={{ width: `${potentieelBreedte}%` }} />
              </span>
              <span className="afdeling__meta">
                {totaal.aantal} use case{totaal.aantal === 1 ? '' : 's'}
                {totaal.potentieleUren > 0 && ` · ${getal(totaal.potentieleUren)} potentieel`}
              </span>
            </div>
          );
        })}
        {totalen.length === 0 && <p className="afdeling__meta">Geen bedrijven in deze selectie.</p>}
      </div>
    </section>
  );
}
