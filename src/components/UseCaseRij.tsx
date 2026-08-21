import { useEffect, useId, useState } from 'react';
import { BEDRIJVEN, STATUSSEN } from '../types';
import type { Bedrijf, Status, UseCase, UseCasePatch } from '../types';
import { getal, urenPerWeekLabel } from '../lib/format';
import { urenPerJaar } from '../lib/uren';
import { StatusBadge } from './StatusBadge';
import { Modal } from './Modal';

interface UseCaseRijProps {
  useCase: UseCase;
  werkweken: number;
  /** Telt deze case mee in de buis? Bepaalt of hover de buis oplicht. */
  teltMee: boolean;
  onMarkeer(id: string | null): void;
  onOpslaan(id: string, patch: UseCasePatch): Promise<unknown>;
  onVerwijder(id: string): Promise<void>;
}

/** Zet de ruwe invoer om naar het aantal uren per week, of null als het leeg is. */
function leesUren(invoer: string): number | null | undefined {
  const genormaliseerd = invoer.trim().replace(',', '.');
  if (genormaliseerd === '') return null;
  const waarde = Number(genormaliseerd);
  if (!Number.isFinite(waarde) || waarde < 0) return undefined; // ongeldig
  return waarde;
}

/** Eén regel in de use case-lijst: titel, instuurder, bedrijf, team, besparing, status. */
export function UseCaseRij({
  useCase,
  werkweken,
  teltMee,
  onMarkeer,
  onOpslaan,
  onVerwijder,
}: UseCaseRijProps) {
  const [wijzigen, setWijzigen] = useState(false);
  const [uren, setUren] = useState('');
  const [status, setStatus] = useState<Status>(useCase.status);
  const [instuurder, setInstuurder] = useState('');
  const [bedrijf, setBedrijf] = useState<Bedrijf>(useCase.bedrijf);
  const [team, setTeam] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [vraagVerwijderen, setVraagVerwijderen] = useState(false);
  const veldId = useId();

  // Formulier synchroon houden met de use case (ook na opslaan of een reset).
  useEffect(() => {
    setUren(
      useCase.tijdsbesparing_uren_per_week === null
        ? ''
        : String(useCase.tijdsbesparing_uren_per_week),
    );
    setStatus(useCase.status);
    setInstuurder(useCase.instuurder ?? '');
    setBedrijf(useCase.bedrijf);
    setTeam(useCase.team ?? '');
  }, [
    useCase.tijdsbesparing_uren_per_week,
    useCase.status,
    useCase.instuurder,
    useCase.bedrijf,
    useCase.team,
  ]);

  const perJaar = urenPerJaar(useCase.tijdsbesparing_uren_per_week, werkweken);
  const heeftBesparing = useCase.tijdsbesparing_uren_per_week !== null;

  async function opslaan(event: React.FormEvent) {
    event.preventDefault();
    const urenWaarde = leesUren(uren);
    if (urenWaarde === undefined) {
      setFout('Vul een geldig aantal uren per week in, of laat het veld leeg.');
      return;
    }
    setFout(null);
    setBezig(true);
    try {
      await onOpslaan(useCase.id, {
        tijdsbesparing_uren_per_week: urenWaarde,
        status,
        instuurder: instuurder.trim() || null,
        bedrijf,
        team: team.trim() || null,
      });
      setWijzigen(false);
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
        <div className="rij__cel rij__cel--nummer">
          <span className="rij__label">Nr</span>
          <span className={useCase.nummer === null ? 'rij__leeg' : 'rij__nr'}>
            {useCase.nummer ?? 'nieuw'}
          </span>
        </div>

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
          <span>{useCase.bedrijf}</span>
        </div>

        <div className="rij__cel">
          <span className="rij__label">Afdeling / team</span>
          <span className={useCase.team ? '' : 'rij__leeg'}>{useCase.team ?? 'niet ingevuld'}</span>
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
            onClick={() => setWijzigen((huidig) => !huidig)}
            aria-expanded={wijzigen}
          >
            {wijzigen ? 'Sluiten' : 'Wijzigen'}
            <span className="alleen-screenreader"> — {useCase.titel}</span>
          </button>
        </div>
      </div>

      {wijzigen && (
        <form className="bewerk" onSubmit={opslaan}>
          <div className="bewerk__velden">
            <div className="veld">
              <label className="veld__label" htmlFor={`${veldId}-instuurder`}>
                Instuurder
              </label>
              <input
                id={`${veldId}-instuurder`}
                value={instuurder}
                placeholder="leeg = anoniem"
                onChange={(event) => setInstuurder(event.target.value)}
              />
            </div>

            <div className="veld">
              <label className="veld__label" htmlFor={`${veldId}-bedrijf`}>
                Bedrijf
              </label>
              <select
                id={`${veldId}-bedrijf`}
                value={bedrijf}
                onChange={(event) => setBedrijf(event.target.value as Bedrijf)}
              >
                {BEDRIJVEN.map((naam) => (
                  <option key={naam} value={naam}>
                    {naam}
                  </option>
                ))}
              </select>
            </div>

            <div className="veld">
              <label className="veld__label" htmlFor={`${veldId}-team`}>
                Afdeling / team
              </label>
              <input
                id={`${veldId}-team`}
                value={team}
                placeholder="bijv. Programmamanagement"
                onChange={(event) => setTeam(event.target.value)}
              />
            </div>

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

          {fout && (
            <p className="modal__fout" role="alert">
              {fout}
            </p>
          )}

          <div className="bewerk__acties">
            <button type="submit" className="knop knop--goud knop--klein" disabled={bezig}>
              Opslaan
            </button>
            <button
              type="button"
              className="knop knop--rand knop--klein"
              onClick={() => setWijzigen(false)}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="knop knop--gevaar knop--klein"
              onClick={() => setVraagVerwijderen(true)}
            >
              Verwijderen
              <span className="alleen-screenreader"> — {useCase.titel}</span>
            </button>
          </div>
        </form>
      )}

      {vraagVerwijderen && (
        <Modal titel="Use case verwijderen" onSluit={() => setVraagVerwijderen(false)}>
          <p className="modal__vraag">Weet je zeker dat je deze use case wilt verwijderen?</p>
          <p className="modal__doel">
            {useCase.nummer !== null && <span className="rij__nr">{useCase.nummer}</span>}{' '}
            {useCase.titel}
          </p>
          <div className="modal__acties">
            <button
              type="button"
              className="knop knop--rand"
              onClick={() => setVraagVerwijderen(false)}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="knop knop--gevaar"
              disabled={bezig}
              onClick={async () => {
                setBezig(true);
                try {
                  await onVerwijder(useCase.id);
                } finally {
                  setBezig(false);
                }
              }}
            >
              Verwijderen
            </button>
          </div>
        </Modal>
      )}
    </li>
  );
}
