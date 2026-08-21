import { Logo } from './Logo';

interface KopProps {
  onNieuweUseCase(): void;
  onExporteer(): void;
}

export function Kop({ onNieuweUseCase, onExporteer }: KopProps) {
  return (
    <header className="kop">
      <div className="kop__binnen">
        <div className="kop__merk">
          <Logo />
          <div>
            <h1 className="kop__titel">
              HUM<span className="ai">AI</span>N Urenmikker
            </h1>
            <p className="kop__sub">onderdeel van Driessen Groep</p>
          </div>
        </div>
        <div className="kop__acties">
          <button type="button" className="knop knop--rand" onClick={onExporteer}>
            Exporteer bijgewerkte JSON
          </button>
          <button type="button" className="knop knop--goud" onClick={onNieuweUseCase}>
            + Nieuwe use case
          </button>
        </div>
      </div>
    </header>
  );
}
