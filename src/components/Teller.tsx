import { decimaal, getal, percentage } from '../lib/format';
import type { Totalen } from '../lib/uren';
import type { TelModus } from '../config';

interface TellerProps {
  totalen: Totalen;
  jaardoel: number;
  werkweken: number;
  telModus: TelModus;
}

export function Teller({ totalen, jaardoel, werkweken, telModus }: TellerProps) {
  const alleStatussen = telModus === 'alle-statussen';
  return (
    <section className="paneel" aria-labelledby="teller-titel">
      <h2 id="teller-titel" className="paneel__titel">
        {alleStatussen ? 'Besparing (alle statussen)' : 'Gerealiseerde besparing'}
      </h2>
      <div className="teller__hoofd">
        <span className="teller__getal">{getal(totalen.meetellendeUren)}</span>
        <span className="teller__doel">van {getal(jaardoel)} uur/jaar</span>
        <span className="teller__badge">{percentage(totalen.percentage)}</span>
      </div>
      <p className="teller__label">
        Omgerekend met {decimaal(werkweken)} werkweken per jaar
        {alleStatussen ? ' — ideeën en trajecten tellen mee' : ' — alleen use cases met status Done'}
      </p>

      {!alleStatussen && (
        <p className="teller__potentieel">
          Potentieel daarbovenop: <strong>{getal(totalen.potentieleUren)}</strong> uur/jaar uit
          ideeën en trajecten in behandeling.
        </p>
      )}

      <div className="kerncijfers">
        <div className="kerncijfer">
          <div className="kerncijfer__getal">{totalen.aantalUseCases}</div>
          <div className="kerncijfer__label">use cases</div>
        </div>
        <div className="kerncijfer">
          <div className="kerncijfer__getal">{totalen.aantalBedrijven}</div>
          <div className="kerncijfer__label">bedrijven</div>
        </div>
        <div className="kerncijfer">
          <div className="kerncijfer__getal">{totalen.aantalZonderBesparing}</div>
          <div className="kerncijfer__label">nog in te vullen</div>
        </div>
      </div>
    </section>
  );
}
