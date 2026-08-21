import { useEffect, useId, useState } from 'react';
import { STATUSSEN } from '../types';
import type { Status, UseCase, UseCasePatch } from '../types';
import { getal, urenPerWeekLabel } from '../lib/format';
import { urenPerJaar } from '../lib/uren';
import { StatusBadge } from './StatusBadge';

interface UseCaseRijProps {
  useCase: UseCase;
  werkweken: number;
  /** Telt deze case mee in de buis? Bepaalt of hover de buis oplicht. */
  teltMee: boolean;
  onMarkeer(id: string | null): void;
  onOpslaan(id: string, patch: UseCasePatch): Promise<unknown>;
}

/** Eén regel in de use case-lijst: titel, instuurder, afdeling, besparing, status. */
export function UseCaseRij({
  useCase,
  werkweken,
  teltMee,
  onMarkeer,
  onOpslaan,
}: UseCaseRijProps) {
  const [bewerken, setBewerken] = useState(false);
  const [uren, setUren] = useState(
    useCase.tijdsbesparing_uren_per_week === null
      ? ''
      : String(useCase.tijdsbesparing_uren_per_week),
  );
  const [status, setStatus] = useState<Status>(useCase.status);
  const [bezig, setBezig] = useState(false);
  const veldId = useId();

  useEffect(() => {
    setUren(
      useCase.tijdsbesparing_uren_per_week === null
        ? ''
        : String(useCase.tijdsbesparing_uren_per_week),
    );
    setStatus(useCase.status);
  }, [useCase.tijdsbesparing_uren_per_week, useCase.status]);

  const perJaar = urenPerJaar(useCase.tijdsbesparing_uren_per_week, werkweken);
  const heeftBesparing = useCase.tijdsbesparing_uren_per_week !== null;

  async function opslaan(event: React.FormEvent) {
    event.preventDefault();
    const genormaliseerd = uren.trim().replace(',', '.');
    const waarde = genormaliseerd === '' ? null : Number(genormaliseerd);
    if (waarde !== null && (!Number.isFinite(waarde) || waarde < 0)) return;
    setBezig(true);
    try {
      await onOpslaan(useCase.id, { tijdsbesparing_uren_per_week: waarde, status });
      setBewerken(false);
    } finally {
      setBezig(false);
    }
  }

  return (
    <li
      className="rij"
      onMouseEnter={() => teltMee && onMarkeer(useCase.id)}
      onMouseLeave={() => onMarkeer(null)}
      onFocus={() => teltMee && onMarkeer(useCase.id)}
      onBlur={() => onMarkeer(null)}
    >
      <div className="rij__hoofd">
        <div className="rij__cel rij__cel--titel">
          <h3 className="rij__titel">{useCase.titel}</h3>
          {useCase.omschrijving && <p className="rij__omschrijving">{useCase.omschrijving}</p>}
          {useCase.opmerkingen && (
            <p className="rij__opmerking">
              <span className="alleen-screenreader">Opmerking: </span>
              {useCase.opmerkingen}
            </p>
          )}
        </div>

        <div className="rij__cel">
          <span className="rij__label">Instuurder</span>
          <span className={useCase.instuurder ? '' : 'rij__leeg'}>
            {useCase.instuurder ?? 'anoniem ingestuurd'}
          </span>
        </div>

        <div className="rij__cel">
          <span className="rij__label">Bedrijf</span>
          <span>{useCase.afdeling}</span>
        </div>

        <div className="rij__cel rij__cel--uren">
          <span className="rij__label">Tijdsbesparing</span>
          {heeftBesparing ? (
            <>
              <span className="rij__uren">{getal(perJaar)} uur/jaar</span>
              <small>{urenPerWeekLabel(useCase.tijdsbesparing_uren_per_week)}</small>
            </>
          ) : (
            <span className="rij__leeg rij__leeg--nadruk">nog niet ingevuld</span>
          )}
        </div>

        <div className="rij__cel rij__cel--status">
          <span className="rij__label">Status</span>
          <StatusBadge status={useCase.status} />
        </div>

        <div className="rij__cel rij__cel--actie">
          <button
            type="button"
            className="knop knop--rand knop--klein"
            onClick={() => setBewerken((huidig) => !huidig)}
            aria-expanded={bewerken}
          >
            {bewerken ? 'Sluiten' : heeftBesparing ? 'Bewerken' : 'Invullen'}
            <span className="alleen-screenreader"> — {useCase.titel}</span>
          </button>
        </div>
      </div>

      {bewerken && (
        <form className="bewerk" onSubmit={opslaan}>
          <div className="bewerk__rij">
            <div className="veld">
              <label className="veld__label" htmlFor={`${veldId}-uren`}>
                Uren per week
              </label>
              <input
                id={`${veldId}-uren`}
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={uren}
                placeholder="bijv. 4"
                onChange={(event) => setUren(event.target.value)}
              />
            </div>
            <div className="veld">
              <label className="veld__label" htmlFor={`${veldId}-status`}>
                Status
              </label>
              <select
                id={`${veldId}-status`}
                value={status}
                onChange={(event) => setStatus(event.target.value as Status)}
              >
                {STATUSSEN.map((naam) => (
                  <option key={naam} value={naam}>
                    {naam}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="bewerk__acties">
            <button type="submit" className="knop knop--goud knop--klein" disabled={bezig}>
              Opslaan
            </button>
            <button
              type="button"
              className="knop knop--rand knop--klein"
              onClick={() => setBewerken(false)}
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
