import type { ReactNode } from 'react';

interface PaneelKnopProps {
  /** Het getal dat ook zonder uitklappen zichtbaar moet zijn; mag ontbreken. */
  waarde?: string;
  label: ReactNode;
  open: boolean;
  /** Id van het paneel dat deze knop open- en dichtklapt. */
  paneelId: string;
  onClick(): void;
}

/** Pill-knop die een paneel eronder open- en dichtklapt. */
export function PaneelKnop({
  waarde,
  label,
  open,
  paneelId,
  onClick,
}: PaneelKnopProps) {
  return (
    <button
      type="button"
      className={`paneelknop${open ? ' paneelknop--open' : ''}`}
      onClick={onClick}
      aria-expanded={open}
      aria-controls={paneelId}
    >
      {waarde && <span className="paneelknop__waarde">{waarde}</span>}
      <span className="paneelknop__label">{label}</span>
      <span className="paneelknop__chevron" aria-hidden="true" />
    </button>
  );
}
