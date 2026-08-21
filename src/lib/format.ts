const heleGetallen = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const eenDecimaal = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

/** 2530 -> "2.530" */
export function getal(waarde: number): string {
  return heleGetallen.format(Math.round(waarde));
}

/** 25.3 -> "25,3%" */
export function percentage(waarde: number): string {
  return `${eenDecimaal.format(waarde)}%`;
}

/** 6 -> "6 uur/week", 0.5 -> "0,5 uur/week" */
export function urenPerWeekLabel(waarde: number | null): string {
  if (waarde === null) return 'nog niet ingevuld';
  return `${eenDecimaal.format(waarde)} uur/week`;
}
