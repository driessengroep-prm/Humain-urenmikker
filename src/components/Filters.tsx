import { BEDRIJVEN, STATUSSEN } from '../types';
import type { Bedrijf, Status } from '../types';

export type Sortering = 'besparing' | 'nummer' | 'nieuwste' | 'in-te-vullen';

export const sorteerOpties: Array<{ waarde: Sortering; label: string }> = [
  { waarde: 'besparing', label: 'Meeste besparing' },
  { waarde: 'nummer', label: 'Nummer uit de sheet' },
  { waarde: 'nieuwste', label: 'Nieuwste eerst' },
  { waarde: 'in-te-vullen', label: 'Nog in te vullen' },
];

interface FiltersProps {
  bedrijf: Bedrijf | 'alle';
  team: string | 'alle';
  status: Status | 'alle';
  sortering: Sortering;
  aantal: number;
  /** Teams die in de huidige selectie voorkomen, alfabetisch. */
  teams: string[];
  onBedrijf(waarde: Bedrijf | 'alle'): void;
  onTeam(waarde: string | 'alle'): void;
  onStatus(waarde: Status | 'alle'): void;
  onSortering(waarde: Sortering): void;
}

export function Filters({
  bedrijf,
  team,
  status,
  sortering,
  aantal,
  teams,
  onBedrijf,
  onTeam,
  onStatus,
  onSortering,
}: FiltersProps) {
  return (
    <div className="filters">
      <div className="veld">
        <label className="veld__label" htmlFor="filter-bedrijf">
          Bedrijf
        </label>
        <select
          id="filter-bedrijf"
          value={bedrijf}
          onChange={(event) => onBedrijf(event.target.value as Bedrijf | 'alle')}
        >
          <option value="alle">Alle bedrijven</option>
          {BEDRIJVEN.map((naam) => (
            <option key={naam} value={naam}>
              {naam}
            </option>
          ))}
        </select>
      </div>

      <div className="veld">
        <label className="veld__label" htmlFor="filter-team">
          Afdeling / team
        </label>
        <select
          id="filter-team"
          value={team}
          onChange={(event) => onTeam(event.target.value)}
          disabled={teams.length === 0}
        >
          <option value="alle">
            {teams.length === 0 ? 'Geen teams ingevuld' : 'Alle afdelingen / teams'}
          </option>
          {teams.map((naam) => (
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
