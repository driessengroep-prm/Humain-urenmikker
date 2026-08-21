import { AFDELINGEN, STATUSSEN } from '../types';
import type { Afdeling, Status } from '../types';

export type Sortering = 'besparing' | 'nieuwste' | 'in-te-vullen';

export const sorteerOpties: Array<{ waarde: Sortering; label: string }> = [
  { waarde: 'besparing', label: 'Meeste besparing' },
  { waarde: 'nieuwste', label: 'Nieuwste eerst' },
  { waarde: 'in-te-vullen', label: 'Nog in te vullen' },
];

interface FiltersProps {
  afdeling: Afdeling | 'alle';
  status: Status | 'alle';
  sortering: Sortering;
  aantal: number;
  onAfdeling(waarde: Afdeling | 'alle'): void;
  onStatus(waarde: Status | 'alle'): void;
  onSortering(waarde: Sortering): void;
}

export function Filters({
  afdeling,
  status,
  sortering,
  aantal,
  onAfdeling,
  onStatus,
  onSortering,
}: FiltersProps) {
  return (
    <div className="filters">
      <div className="veld">
        <label className="veld__label" htmlFor="filter-afdeling">
          Afdeling
        </label>
        <select
          id="filter-afdeling"
          value={afdeling}
          onChange={(event) => onAfdeling(event.target.value as Afdeling | 'alle')}
        >
          <option value="alle">Alle afdelingen</option>
          {AFDELINGEN.map((naam) => (
            <option key={naam} value={naam}>
              {naam}
            </option>
          ))}
        </select>
      </div>

      <div className="veld">
        <label className="veld__label" htmlFor="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          value={status}
          onChange={(event) => onStatus(event.target.value as Status | 'alle')}
        >
          <option value="alle">Alle statussen</option>
          {STATUSSEN.map((naam) => (
            <option key={naam} value={naam}>
              {naam}
            </option>
          ))}
        </select>
      </div>

      <div className="veld">
        <label className="veld__label" htmlFor="filter-sortering">
          Sorteren op
        </label>
        <select
          id="filter-sortering"
          value={sortering}
          onChange={(event) => onSortering(event.target.value as Sortering)}
        >
          {sorteerOpties.map((optie) => (
            <option key={optie.waarde} value={optie.waarde}>
              {optie.label}
            </option>
          ))}
        </select>
      </div>

      <p className="filters__telling" aria-live="polite">
        {aantal} use case{aantal === 1 ? '' : 's'} in beeld
      </p>
    </div>
  );
}
