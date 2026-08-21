import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDataStore } from '../data';
import type { NieuweUseCase, UseCase, UseCasePatch } from '../types';

export type LaadStatus = 'laden' | 'klaar' | 'fout';

export interface UseCasesResultaat {
  useCases: UseCase[];
  laadStatus: LaadStatus;
  foutmelding: string | null;
  /** true zodra er in deze sessie iets is toegevoegd of gewijzigd. */
  heeftWijzigingen: boolean;
  /** false zolang de dataStore niets buiten deze sessie opslaat. */
  persistent: boolean;
  voegToe(useCase: NieuweUseCase): Promise<UseCase>;
  werkBij(id: string, patch: UseCasePatch): Promise<UseCase>;
  verwijder(id: string): Promise<void>;
}

/**
 * Enige koppeling tussen de UI en de dataStore. Componenten praten hiermee en
 * nooit rechtstreeks met een bestand of API.
 */
export function useUseCases(): UseCasesResultaat {
  const store = useMemo(() => createDataStore(), []);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [laadStatus, setLaadStatus] = useState<LaadStatus>('laden');
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [heeftWijzigingen, setHeeftWijzigingen] = useState(false);

  useEffect(() => {
    let actief = true;
    store
      .getAll()
      .then((data) => {
        if (!actief) return;
        setUseCases(data);
        setLaadStatus('klaar');
      })
      .catch((fout: unknown) => {
        if (!actief) return;
        setFoutmelding(fout instanceof Error ? fout.message : 'Onbekende fout bij het laden.');
        setLaadStatus('fout');
      });
    return () => {
      actief = false;
    };
  }, [store]);

  const voegToe = useCallback(
    async (nieuwe: NieuweUseCase) => {
      const useCase = await store.add(nieuwe);
      setUseCases((huidig) => [useCase, ...huidig]);
      setHeeftWijzigingen(true);
      return useCase;
    },
    [store],
  );

  const werkBij = useCallback(
    async (id: string, patch: UseCasePatch) => {
      const useCase = await store.update(id, patch);
      setUseCases((huidig) => huidig.map((c) => (c.id === id ? useCase : c)));
      setHeeftWijzigingen(true);
      return useCase;
    },
    [store],
  );

  const verwijder = useCallback(
    async (id: string) => {
      await store.verwijder(id);
      setUseCases((huidig) => huidig.filter((c) => c.id !== id));
      setHeeftWijzigingen(true);
    },
    [store],
  );

  return {
    useCases,
    laadStatus,
    foutmelding,
    heeftWijzigingen,
    persistent: store.persistent,
    voegToe,
    werkBij,
    verwijder,
  };
}
