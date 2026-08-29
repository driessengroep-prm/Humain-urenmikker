import { Beeldmerk } from './Beeldmerk';

interface KopProps {
  onNieuweUseCase(): void;
}

export function Kop({ onNieuweUseCase }: KopProps) {
  return (
    <header className="kop">
      <div className="kop__binnen">
        <h1 className="kop__titel">
          <Beeldmerk />
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
