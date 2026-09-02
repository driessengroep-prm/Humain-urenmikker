import { useEffect, useMemo, useState } from 'react';
import { config, type TelModus } from './config';
import { useUseCases } from './hooks/useUseCases';
import { berekenSegmenten, berekenTotalen, perBedrijf, teltMee, urenPerJaar } from './lib/uren';
import { getal, percentage } from './lib/format';
import type { Bedrijf, NieuweUseCase, Status } from './types';
import { BedrijfOverzicht } from './components/BedrijfOverzicht';
import { Buis } from './components/Buis';
import { ExportModal } from './components/ExportModal';
import { Filters, type Sortering } from './components/Filters';
import { Instellingen } from './components/Instellingen';
import { Kop } from './components/Kop';
import { NieuweUseCaseModal } from './components/NieuweUseCaseModal';
import { PaneelKnop } from './components/PaneelKnop';
import { Teller } from './components/Teller';
import { UseCaseRij } from './components/UseCaseRij';

export default function App() {
  const {
    useCases,
    laadStatus,
    foutmelding,
    heeftWijzigingen,
    persistent,
    voegToe,
    werkBij,
    verwijder,
  } = useUseCases();

  const [bedrijfFilter, setBedrijfFilter] = useState<Bedrijf | 'alle'>('alle');
  const [teamFilter, setTeamFilter] = useState<string | 'alle'>('alle');
  const [instuurderFilter, setInstuurderFilter] = useState<string | 'alle'>('alle');
  const [statusFilter, setStatusFilter] = useState<Status | 'alle'>('alle');
  const [zoekterm, setZoekterm] = useState('');
  const [sortering, setSortering] = useState<Sortering>('besparing');
  const [werkweken, setWerkweken] = useState(config.werkwekenPerJaar);
  const [telModus, setTelModus] = useState<TelModus>(config.telModus);
  const [gemarkeerdeId, setGemarkeerdeId] = useState<string | null>(null);
  const [toonTeller, setToonTeller] = useState(false);
  const [toonInstellingen, setToonInstellingen] = useState(false);
  const [toonBedrijven, setToonBedrijven] = useState(false);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [toonExport, setToonExport] = useState(false);

  const opties = useMemo(() => ({ werkweken, telModus }), [werkweken, telModus]);

  /**
   * De meter volgt het bedrijfs- en teamfilter (zo zie je de bijdrage van één
   * label), maar niet het statusfilter: welke statussen meetellen bepaalt de
   * telmodus.
   */
  const meterSet = useMemo(
    () =>
      useCases.filter(
        (useCase) =>
          (bedrijfFilter === 'alle' || useCase.bedrijf === bedrijfFilter) &&
          (teamFilter === 'alle' || useCase.team === teamFilter) &&
          (instuurderFilter === 'alle' || useCase.instuurder === instuurderFilter),
      ),
    [useCases, bedrijfFilter, teamFilter, instuurderFilter],
  );

  /** Teams die voorkomen binnen het gekozen bedrijf, alfabetisch en zonder dubbele. */
  const teams = useMemo(() => {
    const binnenBedrijf = useCases.filter(
      (useCase) => bedrijfFilter === 'alle' || useCase.bedrijf === bedrijfFilter,
    );
    const namen = new Set<string>();
    for (const useCase of binnenBedrijf) if (useCase.team) namen.add(useCase.team);
    return [...namen].sort((a, b) => a.localeCompare(b, 'nl'));
  }, [useCases, bedrijfFilter]);

  /** Instuurders binnen het gekozen bedrijf en team, alfabetisch en zonder dubbele. */
  const instuurders = useMemo(() => {
    const binnenSelectie = useCases.filter(
      (useCase) =>
        (bedrijfFilter === 'alle' || useCase.bedrijf === bedrijfFilter) &&
        (teamFilter === 'alle' || useCase.team === teamFilter),
    );
    const namen = new Set<string>();
    for (const useCase of binnenSelectie) if (useCase.instuurder) namen.add(useCase.instuurder);
    return [...namen].sort((a, b) => a.localeCompare(b, 'nl'));
  }, [useCases, bedrijfFilter, teamFilter]);

  // Een keuze die niet meer in de selectie voorkomt mag niet blijven hangen.
  useEffect(() => {
    if (teamFilter !== 'alle' && !teams.includes(teamFilter)) setTeamFilter('alle');
  }, [teams, teamFilter]);

  useEffect(() => {
    if (instuurderFilter !== 'alle' && !instuurders.includes(instuurderFilter)) {
      setInstuurderFilter('alle');
    }
  }, [instuurders, instuurderFilter]);

  const totalen = useMemo(() => berekenTotalen(meterSet, opties), [meterSet, opties]);
  const bedrijfTotalen = useMemo(
    () =>
      perBedrijf(
        bedrijfFilter === 'alle' && teamFilter === 'alle' && instuurderFilter === 'alle'
          ? useCases
          : meterSet,
        opties,
      ),
    [useCases, meterSet, bedrijfFilter, teamFilter, instuurderFilter, opties],
  );

  // Grootste bijdrage onderin de buis, zodat de volgorde stabiel en leesbaar is.
  const segmenten = useMemo(() => {
    const gesorteerd = [...meterSet].sort(
      (a, b) =>
        urenPerJaar(b.tijdsbesparing_uren_per_week, werkweken) -
        urenPerJaar(a.tijdsbesparing_uren_per_week, werkweken),
    );
    return berekenSegmenten(gesorteerd, opties);
  }, [meterSet, werkweken, opties]);

  const zichtbaar = useMemo(() => {
    // Hoofdletterongevoelig zoeken op een woord of zin in titel of omschrijving.
    const zoek = zoekterm.trim().toLowerCase();
    const gefilterd = meterSet.filter(
      (useCase) =>
        (statusFilter === 'alle' || useCase.status === statusFilter) &&
        (zoek === '' ||
          useCase.titel.toLowerCase().includes(zoek) ||
          useCase.omschrijving.toLowerCase().includes(zoek)),
    );
    const gesorteerd = [...gefilterd];
    if (sortering === 'besparing') {
      gesorteerd.sort(
        (a, b) =>
          urenPerJaar(b.tijdsbesparing_uren_per_week, werkweken) -
          urenPerJaar(a.tijdsbesparing_uren_per_week, werkweken),
      );
    } else if (sortering === 'nummer') {
      gesorteerd.sort((a, b) => (a.nummer ?? Infinity) - (b.nummer ?? Infinity));
    } else if (sortering === 'in-te-vullen') {
      gesorteerd.sort((a, b) => {
        const aLeeg = a.tijdsbesparing_uren_per_week === null ? 0 : 1;
        const bLeeg = b.tijdsbesparing_uren_per_week === null ? 0 : 1;
        return aLeeg - bLeeg;
      });
    }
    // 'nieuwste' houdt de volgorde van de dataStore aan: nieuw toegevoegd staat vooraan.
    return gesorteerd;
  }, [meterSet, statusFilter, zoekterm, sortering, werkweken]);

  async function opslaanNieuw(nieuwe: NieuweUseCase) {
    const useCase = await voegToe(nieuwe);
    setSortering('nieuwste');
    return useCase;
  }

  return (
    <>
      <a className="overslaan" href="#use-cases">
        Naar de use cases
      </a>
      <Kop onNieuweUseCase={() => setToonNieuw(true)} />

      <main className="hoofd">
        {laadStatus === 'fout' && (
          <p className="melding melding--fout" role="alert">
            <i className="melding__punt" aria-hidden="true" />
            <span>Het bronbestand kon niet geladen worden: {foutmelding}</span>
          </p>
        )}

        {heeftWijzigingen && !persistent && (
          <p className="melding" role="status">
            <i className="melding__punt" aria-hidden="true" />
            <span>
              Je wijzigingen staan alleen in deze browsersessie — ze zijn nog niet opgeslagen voor
              anderen en verdwijnen bij het verversen van de pagina.{' '}
              <button type="button" className="melding__link" onClick={() => setToonExport(true)}>
                Exporteer de bijgewerkte JSON
              </button>{' '}
              om ze te bewaren.
            </span>
          </p>
        )}

        <div className="paneelbalk">
          <div className="knoppenbalk">
            <PaneelKnop
              waarde={`${getal(totalen.meetellendeUren)} uur`}
              label={telModus === 'alle-statussen' ? 'besparing' : 'gerealiseerd'}
              badge={percentage(totalen.percentage)}
              open={toonTeller}
              paneelId="paneel-teller"
              onClick={() => setToonTeller((huidig) => !huidig)}
            />
            <PaneelKnop
              waarde={`${werkweken}`}
              label="werkweken · rekeninstellingen"
              open={toonInstellingen}
              paneelId="paneel-instellingen"
              onClick={() => setToonInstellingen((huidig) => !huidig)}
            />
            <PaneelKnop
              waarde={`${bedrijfTotalen.length}`}
              label="bedrijven · besparing per bedrijf"
              open={toonBedrijven}
              paneelId="paneel-bedrijven"
              onClick={() => setToonBedrijven((huidig) => !huidig)}
            />
          </div>

          <div id="paneel-teller" hidden={!toonTeller}>
            {toonTeller && (
              <Teller
                totalen={totalen}
                jaardoel={config.jaardoelUren}
                werkweken={werkweken}
                telModus={telModus}
              />
            )}
          </div>
          <div id="paneel-instellingen" hidden={!toonInstellingen}>
            {toonInstellingen && (
              <Instellingen
                werkweken={werkweken}
                telModus={telModus}
                onWerkweken={setWerkweken}
                onTelModus={setTelModus}
              />
            )}
          </div>
          <div id="paneel-bedrijven" hidden={!toonBedrijven}>
            {toonBedrijven && <BedrijfOverzicht totalen={bedrijfTotalen} />}
          </div>
        </div>

        <div className="band">
          <section className="paneel buis-paneel" aria-labelledby="buis-titel">
            <div className="buis-paneel__kop">
              <h2 id="buis-titel">De Urenmikker</h2>
              <p>
                {bedrijfFilter === 'alle' && teamFilter === 'alle' && instuurderFilter === 'alle'
                  ? 'Totaal familie van bedrijven'
                  : `Selectie: ${[bedrijfFilter, teamFilter, instuurderFilter]
                      .filter((waarde) => waarde !== 'alle')
                      .join(' · ')}`}
              </p>
            </div>
            <Buis
              meetellendeUren={totalen.meetellendeUren}
              potentieleUren={totalen.potentieleUren}
              jaardoel={config.jaardoelUren}
              segmenten={segmenten}
              gemarkeerdeId={gemarkeerdeId}
              potentieelTeltMee={telModus === 'alle-statussen'}
              selectieSleutel={`${bedrijfFilter}|${teamFilter}|${instuurderFilter}|${telModus}|${werkweken}`}
            />
          </section>

          <div className="band__lijst">
          <h2 id="use-cases" className="alleen-screenreader">
            Use cases
          </h2>
          <Filters
            bedrijf={bedrijfFilter}
            team={teamFilter}
            instuurder={instuurderFilter}
            status={statusFilter}
            zoekterm={zoekterm}
            sortering={sortering}
            aantal={zichtbaar.length}
            teams={teams}
            instuurders={instuurders}
            onBedrijf={setBedrijfFilter}
            onTeam={setTeamFilter}
            onInstuurder={setInstuurderFilter}
            onStatus={setStatusFilter}
            onZoekterm={setZoekterm}
            onSortering={setSortering}
          />

          {laadStatus === 'laden' ? (
            <p className="leeg">Use cases worden geladen…</p>
          ) : zichtbaar.length === 0 ? (
            <p className="leeg">Geen use cases die aan dit filter voldoen.</p>
          ) : (
            <div className="lijst-blok">
              <div className="lijst__kop" aria-hidden="true">
                <span>Nr</span>
                <span>Use case</span>
                <span>Instuurder</span>
                <span>Bedrijf</span>
                <span>Afdeling / team</span>
                <span>Tijdsbesparing</span>
                <span>Status</span>
                <span />
              </div>
              <ul className="lijst">
                {zichtbaar.map((useCase) => (
                  <UseCaseRij
                    key={useCase.id}
                    useCase={useCase}
                    werkweken={werkweken}
                    teltMee={teltMee(useCase, telModus)}
                    onMarkeer={setGemarkeerdeId}
                    onOpslaan={werkBij}
                    onVerwijder={verwijder}
                  />
                ))}
              </ul>
            </div>
          )}
          </div>
        </div>

      </main>

      <footer className="voet">
        <p>
          HUMAIN Urenmikker · jaardoel {config.jaardoelUren.toLocaleString('nl-NL')} uur · bron:{' '}
          <code>use-cases.json</code> · wijzigingen in deze versie zijn nog niet centraal opgeslagen.
        </p>
      </footer>

      {toonNieuw && (
        <NieuweUseCaseModal
          standaardBedrijf={bedrijfFilter === 'alle' ? undefined : bedrijfFilter}
          onSluit={() => setToonNieuw(false)}
          onOpslaan={opslaanNieuw}
        />
      )}
      {toonExport && <ExportModal useCases={useCases} onSluit={() => setToonExport(false)} />}
    </>
  );
}
