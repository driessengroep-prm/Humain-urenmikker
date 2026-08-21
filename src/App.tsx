import { useMemo, useState } from 'react';
import { config, type TelModus } from './config';
import { useUseCases } from './hooks/useUseCases';
import { berekenSegmenten, berekenTotalen, perAfdeling, teltMee, urenPerJaar } from './lib/uren';
import type { Afdeling, NieuweUseCase, Status } from './types';
import { AfdelingOverzicht } from './components/AfdelingOverzicht';
import { Buis } from './components/Buis';
import { ExportModal } from './components/ExportModal';
import { Filters, type Sortering } from './components/Filters';
import { Instellingen } from './components/Instellingen';
import { Kop } from './components/Kop';
import { NieuweUseCaseModal } from './components/NieuweUseCaseModal';
import { Teller } from './components/Teller';
import { UseCaseRij } from './components/UseCaseRij';

export default function App() {
  const { useCases, laadStatus, foutmelding, heeftWijzigingen, persistent, voegToe, werkBij } =
    useUseCases();

  const [afdelingFilter, setAfdelingFilter] = useState<Afdeling | 'alle'>('alle');
  const [statusFilter, setStatusFilter] = useState<Status | 'alle'>('alle');
  const [sortering, setSortering] = useState<Sortering>('besparing');
  const [werkweken, setWerkweken] = useState(config.werkwekenPerJaar);
  const [telModus, setTelModus] = useState<TelModus>(config.telModus);
  const [gemarkeerdeId, setGemarkeerdeId] = useState<string | null>(null);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [toonExport, setToonExport] = useState(false);

  const opties = useMemo(() => ({ werkweken, telModus }), [werkweken, telModus]);

  /**
   * De meter volgt het bedrijfsfilter (zo zie je de bijdrage van één label),
   * maar niet het statusfilter: welke statussen meetellen bepaalt de telmodus.
   */
  const meterSet = useMemo(
    () =>
      afdelingFilter === 'alle'
        ? useCases
        : useCases.filter((useCase) => useCase.afdeling === afdelingFilter),
    [useCases, afdelingFilter],
  );

  const totalen = useMemo(() => berekenTotalen(meterSet, opties), [meterSet, opties]);
  const afdelingTotalen = useMemo(
    () => perAfdeling(afdelingFilter === 'alle' ? useCases : meterSet, opties),
    [useCases, meterSet, afdelingFilter, opties],
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
    const gefilterd = meterSet.filter(
      (useCase) => statusFilter === 'alle' || useCase.status === statusFilter,
    );
    const gesorteerd = [...gefilterd];
    if (sortering === 'besparing') {
      gesorteerd.sort(
        (a, b) =>
          urenPerJaar(b.tijdsbesparing_uren_per_week, werkweken) -
          urenPerJaar(a.tijdsbesparing_uren_per_week, werkweken),
      );
    } else if (sortering === 'in-te-vullen') {
      gesorteerd.sort((a, b) => {
        const aLeeg = a.tijdsbesparing_uren_per_week === null ? 0 : 1;
        const bLeeg = b.tijdsbesparing_uren_per_week === null ? 0 : 1;
        return aLeeg - bLeeg;
      });
    }
    // 'nieuwste' houdt de volgorde van de dataStore aan: nieuw toegevoegd staat vooraan.
    return gesorteerd;
  }, [meterSet, statusFilter, sortering, werkweken]);

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
      <Kop onNieuweUseCase={() => setToonNieuw(true)} onExporteer={() => setToonExport(true)} />

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
              anderen. Gebruik <strong>Exporteer bijgewerkte JSON</strong> en laat een beheerder het
              bestand in de repository vervangen.
            </span>
          </p>
        )}

        <div className="dashboard">
          <section className="paneel buis-paneel" aria-labelledby="buis-titel">
            <div className="buis-paneel__kop">
              <h2 id="buis-titel">De Urenmikker</h2>
              <p>
                {afdelingFilter === 'alle'
                  ? 'Alle bedrijven samen'
                  : `Selectie: ${afdelingFilter}`}
              </p>
            </div>
            <Buis
              meetellendeUren={totalen.meetellendeUren}
              potentieleUren={totalen.potentieleUren}
              jaardoel={config.jaardoelUren}
              segmenten={segmenten}
              gemarkeerdeId={gemarkeerdeId}
              potentieelTeltMee={telModus === 'alle-statussen'}
            />
          </section>

          <div className="rechterkolom">
            <Teller
              totalen={totalen}
              jaardoel={config.jaardoelUren}
              werkweken={werkweken}
              telModus={telModus}
            />
            <Instellingen
              werkweken={werkweken}
              telModus={telModus}
              onWerkweken={setWerkweken}
              onTelModus={setTelModus}
            />
            <AfdelingOverzicht totalen={afdelingTotalen} />
          </div>
        </div>

        <h2 id="use-cases" className="alleen-screenreader">
          Use cases
        </h2>
        <Filters
          afdeling={afdelingFilter}
          status={statusFilter}
          sortering={sortering}
          aantal={zichtbaar.length}
          onAfdeling={setAfdelingFilter}
          onStatus={setStatusFilter}
          onSortering={setSortering}
        />

        {laadStatus === 'laden' ? (
          <p className="leeg">Use cases worden geladen…</p>
        ) : zichtbaar.length === 0 ? (
          <p className="leeg">Geen use cases die aan dit filter voldoen.</p>
        ) : (
          <div className="lijst-blok">
            <div className="lijst__kop" aria-hidden="true">
              <span>Use case</span>
              <span>Instuurder</span>
              <span>Bedrijf</span>
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
                />
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="voet">
        <p>
          HUMAIN Urenmikker · jaardoel {config.jaardoelUren.toLocaleString('nl-NL')} uur · bron:{' '}
          <code>use-cases.json</code> · wijzigingen in deze versie zijn nog niet centraal opgeslagen.
        </p>
      </footer>

      {toonNieuw && (
        <NieuweUseCaseModal
          standaardAfdeling={afdelingFilter === 'alle' ? undefined : afdelingFilter}
          onSluit={() => setToonNieuw(false)}
          onOpslaan={opslaanNieuw}
        />
      )}
      {toonExport && <ExportModal useCases={useCases} onSluit={() => setToonExport(false)} />}
    </>
  );
}
