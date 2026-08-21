import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  titel: string;
  omschrijving?: string;
  onSluit(): void;
  children: ReactNode;
}

const focusbaar =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Dialoog met focus-trap, Escape-afsluiting en focusherstel. */
export function Modal({ titel, omschrijving, onSluit, children }: ModalProps) {
  const paneel = useRef<HTMLDivElement>(null);
  const vorigeFocus = useRef<HTMLElement | null>(null);
  const titelId = useId();

  useEffect(() => {
    vorigeFocus.current = document.activeElement as HTMLElement | null;
    const eersteVeld = paneel.current?.querySelector<HTMLElement>(focusbaar);
    eersteVeld?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      vorigeFocus.current?.focus();
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onSluit();
      return;
    }
    if (event.key !== 'Tab' || !paneel.current) return;
    const elementen = [...paneel.current.querySelectorAll<HTMLElement>(focusbaar)];
    if (elementen.length === 0) return;
    const eerste = elementen[0];
    const laatste = elementen[elementen.length - 1];
    if (event.shiftKey && document.activeElement === eerste) {
      event.preventDefault();
      laatste.focus();
    } else if (!event.shiftKey && document.activeElement === laatste) {
      event.preventDefault();
      eerste.focus();
    }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onSluit();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        ref={paneel}
        onKeyDown={onKeyDown}
      >
        <div className="modal__kop">
          <div>
            <h2 id={titelId}>{titel}</h2>
            {omschrijving && <p>{omschrijving}</p>}
          </div>
          <button type="button" className="modal__sluit" onClick={onSluit} aria-label="Sluiten">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
