import { useState } from 'react';
import { AFDELINGEN, STATUSSEN } from '../types';
import type { Afdeling, NieuweUseCase, Status } from '../types';
import { Modal } from './Modal';

interface NieuweUseCaseModalProps {
  standaardAfdeling?: Afdeling;
  onSluit(): void;
  onOpslaan(useCase: NieuweUseCase): Promise<unknown>;
}

export function NieuweUseCaseModal({
  standaardAfdeling,
  onSluit,
  onOpslaan,
}: NieuweUseCaseModalProps) {
  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [afdeling, setAfdeling] = useState<Afdeling>(standaardAfdeling ?? 'Driessen Groep');
  const [status, setStatus] = useState<Status>('Idee');
  const [instuurder, setInstuurder] = useState('');
  const [uren, setUren] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    if (!titel.trim()) {
      setFout('Geef de use case een titel.');
      return;
    }
    const genormaliseerd = uren.trim().replace(',', '.');
    const waarde = genormaliseerd === '' ? null : Number(genormaliseerd);
    if (waarde !== null && (!Number.isFinite(waarde) || waarde < 0)) {
      setFout('Vul een geldig aantal uren per week in (of laat het veld leeg).');
      return;
    }
    setFout(null);
    setBezig(true);
    try {
      await onOpslaan({
        titel: titel.trim(),
        omschrijving: omschrijving.trim(),
        afdeling,
        status,
        instuurder: instuurder.trim() || null,
        tijdsbesparing_uren_per_week: waarde,
        opmerkingen: null,
      });
      onSluit();
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Opslaan is niet gelukt.');
    } finally {
      setBezig(false);
    }
  }

  return (
    <Modal
      titel="Nieuwe use case"
      omschrijving="De besparing vul je in per week; de Urenmikker rekent het om naar uren per jaar."
      onSluit={onSluit}
    >
      <form onSubmit={verstuur}>
        <div className="modal__velden">
          <div className="veld veld--breed">
            <label className="veld__label" htmlFor="nieuw-titel">
              Titel
            </label>
            <input
              id="nieuw-titel"
              value={titel}
              onChange={(event) => setTitel(event.target.value)}
              placeholder="Waar helpt AI mee?"
              required
            />
          </div>

          <div className="veld veld--breed">
            <label className="veld__label" htmlFor="nieuw-omschrijving">
              Omschrijving
            </label>
            <textarea
              id="nieuw-omschrijving"
              value={omschrijving}
              onChange={(event) => setOmschrijving(event.target.value)}
              placeholder="Wat gebeurt er nu handmatig, en wat neemt AI over?"
            />
          </div>

          <div className="modal__rij">
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-afdeling">
                Bedrijf
              </label>
              <select
                id="nieuw-afdeling"
                value={afdeling}
                onChange={(event) => setAfdeling(event.target.value as Afdeling)}
              >
                {AFDELINGEN.map((naam) => (
                  <option key={naam} value={naam}>
                    {naam}
                  </option>
                ))}
              </select>
            </div>
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-status">
                Status
              </label>
              <select
                id="nieuw-status"
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

          <div className="modal__rij">
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-instuurder">
                Instuurder (optioneel)
              </label>
              <input
                id="nieuw-instuurder"
                value={instuurder}
                onChange={(event) => setInstuurder(event.target.value)}
                placeholder="Naam of team — mag leeg blijven"
              />
            </div>
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-uren">
                Uren per week (optioneel)
              </label>
              <input
                id="nieuw-uren"
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={uren}
                onChange={(event) => setUren(event.target.value)}
                placeholder="bijv. 4"
              />
            </div>
          </div>

          {fout && (
            <p className="modal__fout" role="alert">
              {fout}
            </p>
          )}
        </div>

        <div className="modal__acties">
          <button type="button" className="knop knop--rand" onClick={onSluit}>
            Annuleren
          </button>
          <button type="submit" className="knop knop--goud" disabled={bezig}>
            Use case toevoegen
          </button>
        </div>
      </form>
    </Modal>
  );
}
