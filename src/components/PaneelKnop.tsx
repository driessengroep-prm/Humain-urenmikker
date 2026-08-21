interface PaneelKnopProps {
  /** Het getal dat ook zonder uitklappen zichtbaar moet zijn. */
  waarde: string;
  label: string;
  /** Klein accent rechts in de knop, bijvoorbeeld het percentage. */
  badge?: string;
  open: boolean;
  /** Id van het paneel dat deze knop open- en dichtklapt. */
  paneelId: string;
  onClick(): void;
}

/** Pill-knop die een paneel eronder open- en dichtklapt. */
export function PaneelKnop({
  waarde,
  label,
  badge,
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
      <span className="paneelknop__waarde">{waarde}</span>
      <span className="paneelknop__label">{label}</span>
      {badge && <span className="paneelknop__badge">{badge}</span>}
      <span className="paneelknop__chevron" aria-hidden="true" />
    </button>
  );
}
