import { useState } from 'react';
import { BEDRIJVEN, STATUSSEN } from '../types';
import type { Bedrijf, NieuweUseCase, Status } from '../types';
import { Modal } from './Modal';

interface NieuweUseCaseModalProps {
  standaardBedrijf?: Bedrijf;
  onSluit(): void;
  onOpslaan(useCase: NieuweUseCase): Promise<unknown>;
}

/**
 * Toegestane invoer voor de tijdsbesparing: cijfers, eventueel met één komma of
 * punt als decimaalteken. Alles daarbuiten (letters, "onbekend", "1 tot 6")
 * wordt geweigerd, want daar liep de bronsheet juist op vast.
 */
const ALLEEN_CIJFERS = /^\d*(?:[.,]\d*)?$/;

type Velden = 'titel' | 'omschrijving' | 'instuurder' | 'uren';

export function NieuweUseCaseModal({
  standaardBedrijf,
  onSluit,
  onOpslaan,
}: NieuweUseCaseModalProps) {
  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [bedrijf, setBedrijf] = useState<Bedrijf>(standaardBedrijf ?? 'Driessen Groep');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState<Status>('Idee');
  const [instuurder, setInstuurder] = useState('');
  const [uren, setUren] = useState('');
  const [fouten, setFouten] = useState<Partial<Record<Velden, string>>>({});
  const [bezig, setBezig] = useState(false);

  function meldFout(veld: Velden, melding?: string) {
    setFouten((huidig) => {
      const volgende = { ...huidig };
      if (melding) volgende[veld] = melding;
      else delete volgende[veld];
      return volgende;
    });
  }

  /** Weigert de toetsaanslag zodra er iets anders dan een getal in komt. */
  function urenInvoer(waarde: string) {
    if (!ALLEEN_CIJFERS.test(waarde)) {
      meldFout('uren', 'Vul alleen cijfers in, bijvoorbeeld 4 of 2,5.');
      return;
    }
    meldFout('uren');
    setUren(waarde);
  }

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    const nieuweFouten: Partial<Record<Velden, string>> = {};
    if (!titel.trim()) nieuweFouten.titel = 'Dit veld is verplicht.';
    if (!omschrijving.trim()) nieuweFouten.omschrijving = 'Dit veld is verplicht.';
    if (!instuurder.trim()) nieuweFouten.instuurder = 'Dit veld is verplicht.';

    const genormaliseerd = uren.trim().replace(',', '.');
    const waarde = Number(genormaliseerd);
    if (!genormaliseerd) nieuweFouten.uren = 'Dit veld is verplicht.';
    else if (!Number.isFinite(waarde) || waarde < 0) nieuweFouten.uren = 'Vul een geldig aantal uren in.';

    if (Object.keys(nieuweFouten).length > 0) {
      setFouten(nieuweFouten);
      return;
    }

    setBezig(true);
    try {
      await onOpslaan({
        titel: titel.trim(),
        omschrijving: omschrijving.trim(),
        bedrijf,
        team: team.trim() || null,
        status,
        instuurder: instuurder.trim(),
        tijdsbesparing_uren_per_week: waarde,
        opmerkingen: null,
        nummer: null,
      });
      onSluit();
    } catch (error) {
      setFouten({ titel: error instanceof Error ? error.message : 'Opslaan is niet gelukt.' });
    } finally {
      setBezig(false);
    }
  }

  /** Foutmelding onder een veld, gekoppeld voor schermlezers. */
  function Fout({ veld }: { veld: Velden }) {
    if (!fouten[veld]) return null;
    return (
      <p className="veld__fout" id={`fout-${veld}`} role="alert">
        {fouten[veld]}
      </p>
    );
  }

  return (
    <Modal
      titel="Nieuwe use case"
      omschrijving="De besparing vul je in per week; de Urenmikker rekent het om naar uren per jaar."
      onSluit={onSluit}
    >
      <form onSubmit={verstuur} noValidate>
        <div className="modal__velden">
          <div className="veld veld--breed">
            <label className="veld__label" htmlFor="nieuw-titel">
              Titel
            </label>
            <input
              id="nieuw-titel"
              value={titel}
              onChange={(event) => {
                setTitel(event.target.value);
                meldFout('titel');
              }}
              placeholder="Waar helpt AI en/of automatisering jou?"
              aria-required="true"
              aria-invalid={Boolean(fouten.titel)}
              aria-describedby={fouten.titel ? 'fout-titel' : undefined}
            />
            <Fout veld="titel" />
          </div>

          <div className="veld veld--breed">
            <label className="veld__label" htmlFor="nieuw-omschrijving">
              Omschrijving
            </label>
            <textarea
              id="nieuw-omschrijving"
              value={omschrijving}
              onChange={(event) => {
                setOmschrijving(event.target.value);
                meldFout('omschrijving');
              }}
              placeholder="Wat gebeurt er nu handmatig, en wat neemt AI en/of automatisering over?"
              aria-required="true"
              aria-invalid={Boolean(fouten.omschrijving)}
              aria-describedby={fouten.omschrijving ? 'fout-omschrijving' : undefined}
            />
            <Fout veld="omschrijving" />
          </div>

          <div className="modal__rij">
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-bedrijf">
                Bedrijf
              </label>
              <select
                id="nieuw-bedrijf"
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
              <label className="veld__label" htmlFor="nieuw-team">
                Afdeling / team (optioneel)
              </label>
              <input
                id="nieuw-team"
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                placeholder="bijv. Programmamanagement"
              />
            </div>
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-instuurder">
                Instuurder
              </label>
              <input
                id="nieuw-instuurder"
                value={instuurder}
                onChange={(event) => {
                  setInstuurder(event.target.value);
                  meldFout('instuurder');
                }}
                placeholder="Naam"
                aria-required="true"
                aria-invalid={Boolean(fouten.instuurder)}
                aria-describedby={fouten.instuurder ? 'fout-instuurder' : undefined}
              />
              <Fout veld="instuurder" />
            </div>
          </div>

          <div className="modal__rij">
            <div className="veld">
              <label className="veld__label" htmlFor="nieuw-uren">
                Tijdsbesparing per week in uren
              </label>
              <input
                id="nieuw-uren"
                /*
                 * Bewust geen type="number": daar slikt de browser ongeldige
                 * tekens stil in, en dan kan er geen melding verschijnen.
                 */
                type="text"
                inputMode="decimal"
                value={uren}
                onChange={(event) => urenInvoer(event.target.value)}
                placeholder="bijv. 4"
                aria-required="true"
                aria-invalid={Boolean(fouten.uren)}
                aria-describedby={fouten.uren ? 'fout-uren' : undefined}
              />
              <Fout veld="uren" />
            </div>
          </div>
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
