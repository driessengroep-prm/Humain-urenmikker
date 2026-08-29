import { useState } from 'react';

/**
 * Het HUMAIN-beeldmerk met mascotte Buddy, uit `public/beeldmerk.png`.
 *
 * Ontbreekt het bestand, dan valt de kop terug op het woordmerk in tekst, zodat
 * er altijd iets herkenbaars staat. In de standalone build zit het beeld als
 * data-URI in de pagina.
 */
export function Beeldmerk() {
  const [gelukt, setGelukt] = useState(true);
  const ingebouwd = (globalThis as { __BEELDMERK__?: string }).__BEELDMERK__;

  if (!gelukt && !ingebouwd) {
    return (
      <span className="kop__terugval">
        HUM<span className="kop__ai">AI</span>N
      </span>
    );
  }

  const base = import.meta.env.BASE_URL ?? '/';
  const map = base.endsWith('/') ? base : `${base}/`;
  return (
    <img
      className="kop__beeldmerk"
      src={ingebouwd ?? `${map}beeldmerk.png`}
      alt="HUMAIN"
      onError={() => setGelukt(false)}
    />
  );
}
