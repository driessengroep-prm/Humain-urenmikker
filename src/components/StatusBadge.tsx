import type { Status } from '../types';

const klassen: Record<Status, string> = {
  Done: 'badge badge--done',
  'In behandeling': 'badge badge--behandeling',
  Idee: 'badge badge--idee',
  'Geen AI': 'badge badge--geen',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={klassen[status]}>{status}</span>;
}
