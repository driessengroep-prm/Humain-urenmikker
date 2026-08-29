import { useEffect, useMemo, useRef, useState } from 'react';
import { aantalKnikkers, buis, buisPad, knikkerStraal, maakKnikkers, yVoorUren } from '../lib/knikkers';
import { getal, percentage } from '../lib/format';
import type { Segment } from '../lib/uren';

interface BuisProps {
  /** Uren per jaar die meetellen in de meter. */
  meetellendeUren: number;
  /** Uren per jaar aan potentieel (ideeën en trajecten in behandeling). */
  potentieleUren: number;
  jaardoel: number;
  /** Segmentverdeling van de meetellende use cases over de buis. */
  segmenten: Segment[];
  /** Id van de use case waar de gebruiker overheen zweeft of die focus heeft. */
  gemarkeerdeId: string | null;
  /** Wordt het potentieel al meegeteld in meetellendeUren? */
  potentieelTeltMee: boolean;
  /**
   * Verandert zodra de selectie of de rekeninstellingen wijzigen. Daarmee weet
   * de buis of er knikkers bij komen omdat er iets is afgerond, of alleen omdat
   * er anders gefilterd wordt - in dat laatste geval hoort er niets te vallen.
   */
  selectieSleutel: string;
}

const tickWaarden = Array.from({ length: 11 }, (_, i) => i * 1000);

export function Buis({
  meetellendeUren,
  potentieleUren,
  jaardoel,
  segmenten,
  gemarkeerdeId,
  potentieelTeltMee,
  selectieSleutel,
}: BuisProps) {
  const knikkers = useMemo(() => maakKnikkers(jaardoel), [jaardoel]);

  const ratio = jaardoel > 0 ? Math.min(meetellendeUren / jaardoel, 1) : 0;
  const zichtbaarTot = Math.round(ratio * aantalKnikkers);

  // Vanaf welke knikker er gevallen wordt; null als er niets te vallen valt.
  const [valtVanaf, setValtVanaf] = useState<number | null>(null);
  const vorigeTelling = useRef(zichtbaarTot);
  const vorigeSleutel = useRef(selectieSleutel);
  const eersteKeer = useRef(true);

  useEffect(() => {
    const zelfdeSelectie = vorigeSleutel.current === selectieSleutel;
    const erbij = zichtbaarTot > vorigeTelling.current;
    const vanaf = vorigeTelling.current;

    vorigeSleutel.current = selectieSleutel;
    vorigeTelling.current = zichtbaarTot;

    // De eerste vulling is het inladen van de pagina, niet een afgeronde case.
    if (eersteKeer.current) {
      eersteKeer.current = false;
      return;
    }
    if (!zelfdeSelectie || !erbij) return;

    setValtVanaf(vanaf);
    const timer = setTimeout(() => setValtVanaf(null), 1600);
    return () => clearTimeout(timer);
  }, [zichtbaarTot, selectieSleutel]);

  const gemarkeerd = gemarkeerdeId
    ? segmenten.find((segment) => segment.id === gemarkeerdeId) ?? null
    : null;

  // Potentieel als doorzichtige band bovenop de gevulde knikkers.
  const potentieelTop = potentieelTeltMee
    ? null
    : Math.min(meetellendeUren + potentieleUren, jaardoel);
  const toonPotentieel = potentieelTop !== null && potentieelTop > meetellendeUren + 1;

  const yVul = yVoorUren(meetellendeUren, jaardoel);
  const yPotentieel = yVoorUren(potentieelTop ?? 0, jaardoel);
  const yMarkeerVan = gemarkeerd ? yVoorUren(gemarkeerd.vanUren, jaardoel) : 0;
  const yMarkeerTot = gemarkeerd ? yVoorUren(gemarkeerd.totUren, jaardoel) : 0;

  const beschrijving =
    `De buis is voor ${percentage((meetellendeUren / jaardoel) * 100)} gevuld: ` +
    `${getal(meetellendeUren)} van ${getal(jaardoel)} uur per jaar.` +
    (toonPotentieel ? ` Daarbovenop staat ${getal(potentieleUren)} uur aan potentieel.` : '');

  return (
    <div>
      <svg
        className="buis"
        viewBox={`0 0 ${buis.viewBoxBreedte} ${buis.viewBoxHoogte}`}
        role="img"
        aria-label={beschrijving}
      >
        <defs>
          <linearGradient id="glas" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#f6efe8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e6d9cb" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="knikkerGoud" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#f7ddaa" />
            <stop offset="45%" stopColor="#e3a93a" />
            <stop offset="100%" stopColor="#b8801d" />
          </radialGradient>
          <radialGradient id="knikkerGemarkeerd" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#ffd9c6" />
            <stop offset="40%" stopColor="#e8703f" />
            <stop offset="100%" stopColor="#a83a17" />
          </radialGradient>
          <pattern
            id="potentieelArcering"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="rgba(222, 90, 44, 0.07)" />
            <rect width="3" height="8" fill="rgba(222, 90, 44, 0.22)" />
          </pattern>
          <clipPath id="buisBinnen">
            <path d={buisPad(buis.wand / 2)} />
          </clipPath>
        </defs>

        {/* Maatstreepjes 0 - 10.000 */}
        <g aria-hidden="true">
          {tickWaarden.map((waarde) => {
            const y = yVoorUren(waarde, jaardoel);
            const groot = waarde % 2000 === 0;
            return (
              <g key={waarde}>
                <line
                  x1={buis.x + buis.breedte + 4}
                  y1={y}
                  x2={buis.x + buis.breedte + (groot ? 14 : 8)}
                  y2={y}
                  stroke="#c9b7a4"
                  strokeWidth={groot ? 1.6 : 1}
                  strokeLinecap="round"
                />
                {groot && (
                  <text
                    x={buis.x + buis.breedte + 19}
                    y={y + 3.5}
                    fontSize="10"
                    fontFamily="Inter, sans-serif"
                    fill="#6b7f88"
                  >
                    {getal(waarde)}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Glas */}
        <path d={buisPad()} fill="url(#glas)" stroke="#eaddce" strokeWidth="1.5" />

        <g clipPath="url(#buisBinnen)">
          {/* Potentieel */}
          {toonPotentieel && (
            <g className="buis__band">
              <rect
                x={buis.x}
                y={yPotentieel}
                width={buis.breedte}
                height={Math.max(yVul - yPotentieel, 0)}
                fill="url(#potentieelArcering)"
              />
              <line
                x1={buis.x}
                y1={yPotentieel}
                x2={buis.x + buis.breedte}
                y2={yPotentieel}
                stroke="#de5a2c"
                strokeWidth="1.4"
                strokeDasharray="5 4"
                opacity="0.75"
              />
            </g>
          )}

          {/* Gouden gloed onder het knikkerniveau */}
          <rect
            x={buis.x}
            y={yVul}
            width={buis.breedte}
            height={Math.max(buis.vulBodem - yVul, 0)}
            fill="rgba(227, 169, 58, 0.16)"
            style={{ transition: 'y 0.6s ease, height 0.6s ease' }}
          />

          {/* Knikkers */}
          {knikkers.map((knikker) => {
            const zichtbaar = knikker.index < zichtbaarTot;
            const markeer =
              zichtbaar &&
              gemarkeerd !== null &&
              knikker.totUren > gemarkeerd.vanUren &&
              knikker.vanUren < gemarkeerd.totUren;
            const valt = valtVanaf !== null && knikker.index >= valtVanaf && zichtbaar;
            return (
              <g
                key={knikker.index}
                className={[
                  'buis__knikker',
                  zichtbaar ? '' : 'buis__knikker--verborgen',
                  markeer ? 'buis__knikker--gemarkeerd' : '',
                  valt ? 'buis__knikker--valt' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  valt
                    ? {
                        // Boven de opening van de buis beginnen en naar de eigen plek vallen.
                        ['--val-afstand' as string]: `${buis.vulTop - knikker.cy - 40}px`,
                        animationDelay: `${(knikker.index - valtVanaf) * 70}ms`,
                      }
                    : { transitionDelay: `${Math.min(knikker.index * 6, 700)}ms` }
                }
              >
                <circle
                  cx={knikker.cx}
                  cy={knikker.cy}
                  r={knikkerStraal}
                  fill={markeer ? 'url(#knikkerGemarkeerd)' : 'url(#knikkerGoud)'}
                  stroke="rgba(120, 82, 16, 0.35)"
                  strokeWidth="0.6"
                />
                <circle
                  cx={knikker.cx - 2.6}
                  cy={knikker.cy - 3}
                  r={2.2}
                  fill="#ffffff"
                  opacity="0.7"
                />
              </g>
            );
          })}

          {/* Glansstreep in het glas */}
          <rect
            x={buis.x + 12}
            y={buis.y + 18}
            width="9"
            height={buis.hoogte - 60}
            rx="4.5"
            fill="#ffffff"
            opacity="0.42"
          />
        </g>

        {/* Markering: bijdrage van één use case, met bereik links van de buis */}
        {gemarkeerd && (
          <g className="buis__band" aria-hidden="true">
            <rect
              x={buis.x + 1}
              y={yMarkeerTot}
              width={buis.breedte - 2}
              height={Math.max(yMarkeerVan - yMarkeerTot, 3)}
              fill="none"
              stroke="#de5a2c"
              strokeWidth="1.6"
              rx="2"
            />
            <path
              d={`M ${buis.x - 2} ${yMarkeerTot} H ${buis.x - 12} V ${Math.max(
                yMarkeerVan,
                yMarkeerTot + 3,
              )} H ${buis.x - 2}`}
              fill="none"
              stroke="#de5a2c"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <g
              transform={`translate(0, ${Math.min(
                Math.max((yMarkeerTot + yMarkeerVan) / 2, buis.vulTop + 9),
                buis.vulBodem - 9,
              )})`}
            >
              <rect x="0" y="-9" width="34" height="18" rx="9" fill="#de5a2c" />
              <text
                x="17"
                y="4"
                fontSize="10"
                fontFamily="Poppins, sans-serif"
                fontWeight="600"
                fill="#ffffff"
                textAnchor="middle"
              >
                {getal(gemarkeerd.totUren - gemarkeerd.vanUren)}
              </text>
            </g>
          </g>
        )}

        {/* Doelstreep */}
        <g aria-hidden="true">
          <line
            x1={buis.x - 12}
            y1={buis.vulTop}
            x2={buis.x + buis.breedte + 16}
            y2={buis.vulTop}
            stroke="#2e5561"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
          <text
            x={buis.x - 14}
            y={buis.vulTop - 7}
            fontSize="11"
            fontFamily="Poppins, sans-serif"
            fontWeight="600"
            fill="#2e5561"
          >
            doel {getal(jaardoel)}
          </text>
        </g>

        {/* Voetje van de buis */}
        <rect
          x={buis.x - 8}
          y={buis.y + buis.hoogte - 4}
          width={buis.breedte + 16}
          height="12"
          rx="6"
          fill="#eaddce"
        />
      </svg>

      <p className="buis__legenda">
        <span>
          <i className="buis__stip" style={{ background: 'var(--goud)' }} />
          gerealiseerd
        </span>
        {toonPotentieel && (
          <span>
            <i
              className="buis__stip"
              style={{ background: 'rgba(222, 90, 44, 0.35)', border: '1px dashed #de5a2c' }}
            />
            potentieel
          </span>
        )}
      </p>
    </div>
  );
}
