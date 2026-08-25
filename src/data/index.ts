import { BuddyDataStore } from './buddyDataStore';
import { JsonDataStore } from './jsonDataStore';
import type { DataStore } from './dataStore';

/**
 * Kiest de actieve dataStore-implementatie.
 *
 * Staan de Buddy Data-instellingen ingevuld, dan gaat alles daarheen en zien collega's elkaars
 * wijzigingen. Zo niet, dan valt de app terug op use-cases.json in het geheugen — dat blijft
 * werken voor een lokale demo of een omgeving zonder Buddy, en dan zegt de UI ook dat er niets
 * bewaard wordt.
 */
export function createDataStore(): DataStore {
  const buddyUrl = import.meta.env.VITE_BUDDY_URL;
  const dataUrl = import.meta.env.VITE_BUDDY_DATA_URL;
  const project = import.meta.env.VITE_BUDDY_PROJECT;

  if (buddyUrl && dataUrl && project) {
    return new BuddyDataStore({ buddyUrl, dataUrl, project });
  }

  return new JsonDataStore();
}

export type { DataStore } from './dataStore';
