import { Buddy } from './Buddy';

interface KopProps {
  onNieuweUseCase(): void;
}

export function Kop({ onNieuweUseCase }: KopProps) {
  return (
    <header className="kop">
      <div className="kop__binnen">
        <div className="kop__merk">
          <Buddy />
          <div className="kop__woordmerk">
            <p className="kop__tagline">makkelijker en menselijker</p>
            <h1 className="kop__titel">
              <span className="kop__humain">
                HUM<span className="kop__a">A</span>IN
              </span>{' '}
              <span className="kop__product">Urenmikker</span>
            </h1>
            <p className="kop__sub">onderdeel van Driessen Groep</p>
          </div>
        </div>
        <div className="kop__acties">
          <button type="button" className="knop knop--goud" onClick={onNieuweUseCase}>
            + Nieuwe use case
          </button>
        </div>
      </div>
    </header>
  );
}
