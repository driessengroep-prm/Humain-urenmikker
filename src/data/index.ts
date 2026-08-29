import { BuddyDataStore } from './buddyDataStore';
import { JsonDataStore } from './jsonDataStore';
import type { DataStore } from './dataStore';

/**
 * Kiest de actieve dataStore-implementatie.
 *
 * Staan de Buddy Data- en Entra-instellingen ingevuld, dan gaat alles daarheen en zien collega's
 * elkaars wijzigingen. Zo niet, dan valt de app terug op use-cases.json in het geheugen — dat
 * blijft werken voor een lokale demo of een omgeving zonder Buddy, en dan zegt de UI ook dat er
 * niets bewaard wordt.
 *
 * Alles of niets: met de helft van de instellingen zou de app om een login vragen die nergens
 * heen gaat, en dat is verwarrender dan de terugval.
 */
export function createDataStore(): DataStore {
  const buddyUrl = import.meta.env.VITE_BUDDY_URL;
  const page = import.meta.env.VITE_BUDDY_PAGE;
  const database = import.meta.env.VITE_BUDDY_DATABASE;
  const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
  const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;

  if (buddyUrl && page && database && clientId && tenantId) {
    return new BuddyDataStore({ buddyUrl, page, database, entra: { clientId, tenantId } });
  }

  return new JsonDataStore();
}

export type { DataStore } from './dataStore';
