/**
 * Het eerstvolgende vrije volgnummer: één hoger dan het hoogste dat in gebruik
 * is. Verdwijnt het hoogste nummer omdat de case verwijderd wordt, dan komt het
 * daarmee weer vrij. Bestaande nummers blijven ongemoeid, zodat ze naar dezelfde
 * regel in de bronsheet blijven verwijzen.
 */
export function volgendNummer(useCases: ReadonlyArray<{ nummer: number | null }>): number {
  return useCases.reduce((hoogste, useCase) => Math.max(hoogste, useCase.nummer ?? 0), 0) + 1;
}
