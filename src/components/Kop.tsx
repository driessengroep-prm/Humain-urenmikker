import { Beeldmerk } from './Beeldmerk';

interface KopProps {
  onNieuweUseCase(): void;
  onHerstel(): void;
}

export function Kop({ onNieuweUseCase, onHerstel }: KopProps) {
  return (
    <header className="kop">
      <div className="kop__binnen">
        <h1 className="kop__titel">
          <button
            type="button"
            className="kop__thuis"
            onClick={onHerstel}
            title="Terug naar de beginstand"
            aria-label="Terug naar de beginstand"
          >
            <Beeldmerk />
          </button>
          <span className="kop__product">Urenmikker</span>
        </h1>
        <div className="kop__acties">
          <button type="button" className="knop knop--goud" onClick={onNieuweUseCase}>
            + Nieuwe use case
          </button>
        </div>
      </div>
    </header>
  );
}
