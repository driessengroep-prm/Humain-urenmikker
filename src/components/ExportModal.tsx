import { useState } from 'react';
import type { UseCase } from '../types';
import { alsJson, downloadJson, kopieerJson } from '../lib/exporteer';
import { Modal } from './Modal';

interface ExportModalProps {
  useCases: UseCase[];
  onSluit(): void;
}

export function ExportModal({ useCases, onSluit }: ExportModalProps) {
  const [melding, setMelding] = useState<string | null>(null);
  const json = alsJson(useCases);

  async function kopieer() {
    const gelukt = await kopieerJson(useCases);
    setMelding(
      gelukt
        ? 'Gekopieerd naar het klembord.'
        : 'Kopiëren lukte niet — selecteer de tekst hieronder en kopieer handmatig.',
    );
  }

  return (
    <Modal
      titel="Exporteer bijgewerkte JSON"
      omschrijving="Dit is de volledige dataset inclusief jouw wijzigingen. Een beheerder vervangt hiermee public/use-cases.json in de repository; na de deploy ziet iedereen de nieuwe stand."
      onSluit={onSluit}
    >
      <div className="modal__velden">
        <div className="modal__acties" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
          <button type="button" className="knop knop--goud" onClick={() => downloadJson(useCases)}>
            Download use-cases.json
          </button>
          <button type="button" className="knop knop--rand" onClick={kopieer}>
            Kopieer naar klembord
          </button>
        </div>
        {melding && (
          <p className="modal__fout" role="status" style={{ color: 'var(--petrol)' }}>
            {melding}
          </p>
        )}
        <pre className="modal__code" tabIndex={0} aria-label="Inhoud van use-cases.json">
          {json}
        </pre>
      </div>
      <div className="modal__acties">
        <button type="button" className="knop knop--rand" onClick={onSluit}>
          Sluiten
        </button>
      </div>
    </Modal>
  );
}
