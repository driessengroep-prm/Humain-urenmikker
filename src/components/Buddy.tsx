import { useState } from 'react';

/**
 * Mascotte Buddy uit het HUMAIN-logo.
 *
 * Zet het beeld als `public/buddy.svg`, `.png` of `.webp` naast de app; de
 * eerste die laadt wordt gebruikt. Is er geen enkele, dan verdwijnt de
 * afbeelding stil en blijft het woordmerk alleen staan, zodat de kop niet
 * breekt zolang het bestand er nog niet is.
 *
 * In de standalone build zit het beeld als data-URI in de pagina; dan is er
 * geen bestand om op te halen.
 */
const bestanden = ['buddy.svg', 'buddy.png', 'buddy.webp'];

export function Buddy() {
  const [poging, setPoging] = useState(0);
  const ingebouwd = (globalThis as { __BUDDY__?: string }).__BUDDY__;
  if (!ingebouwd && poging >= bestanden.length) return null;

  const base = import.meta.env.BASE_URL ?? '/';
  const map = base.endsWith('/') ? base : `${base}/`;
  return (
    <img
      className="kop__buddy"
      src={ingebouwd ?? `${map}${bestanden[poging]}`}
      alt=""
      aria-hidden="true"
      onError={() => setPoging((huidig) => huidig + 1)}
    />
  );
}
