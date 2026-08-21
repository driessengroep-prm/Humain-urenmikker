import { JsonDataStore } from './jsonDataStore';
import type { DataStore } from './dataStore';

/**
 * Kiest de actieve dataStore-implementatie.
 *
 * Zodra Supabase er is, wordt hier gekozen tussen JsonDataStore en
 * SupabaseDataStore (bijvoorbeeld op basis van env-variabelen). Verder in de app
 * hoeft niets te veranderen.
 */
export function createDataStore(): DataStore {
  return new JsonDataStore();
}

export type { DataStore } from './dataStore';
