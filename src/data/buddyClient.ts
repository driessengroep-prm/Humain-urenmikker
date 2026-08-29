import { haalEntraToken, type EntraConfig } from './entraLogin';

/**
 * De verbinding met Buddy Data.
 *
 * Alle verzoeken gaan naar Buddy en niet rechtstreeks naar de database. Dat is geen omweg: het is
 * de enige plek waar te zien is wie wat doet. Ging het verkeer langs Buddy heen, dan zou dat
 * logboek in Postgres met triggers nagebouwd moeten worden.
 *
 * Inloggen gaat met het Driessen-werkaccount (zie entraLogin.ts). Dat token gaat bij elk verzoek
 * mee — geen tweede token, geen sessie, niets om te vernieuwen. Buddy controleert het en bepaalt
 * onder welke rol het verzoek in Postgres draait.
 *
 * Bewust een klein, op zichzelf staand bestand en geen npm-pakket: GitHub Actions bouwt met
 * `npm ci` en heeft alleen deze repo.
 */

export interface BuddyConfig {
  /** Waar Buddy draait. */
  buddyUrl: string;
  /** De korte naam van de pagina; die bepaalt waar je bij mag. */
  page: string;
  /** De database onder die pagina waar deze store mee praat. */
  database: string;
  /** De app-registratie in Entra waarmee de medewerker inlogt. */
  entra: EntraConfig;
}

export class BuddyFout extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'BuddyFout';
  }
}

export interface BuddyFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike';
  value: string;
}

export interface BuddyOpdracht {
  operation: 'select' | 'insert' | 'update';
  table: string;
  columns?: string[];
  filters?: BuddyFilter[];
  values?: Record<string, unknown>;
  order?: string;
  limit?: number;
}

export class BuddyClient {
  constructor(private readonly config: BuddyConfig) {}

  /** Voert één opdracht uit en geeft de rijen terug die eruit komen. */
  async run<T>(opdracht: BuddyOpdracht): Promise<T[]> {
    const token = await haalEntraToken(this.config.entra);

    const antwoord = await fetch(
      `${this.config.buddyUrl.replace(/\/+$/, '')}/api/buddy-data/page-data/${this.config.page}/rows`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ database: this.config.database, ...opdracht }),
      },
    );

    if (!antwoord.ok) {
      throw new BuddyFout(await meldingUit(antwoord), antwoord.status);
    }

    const body = (await antwoord.json()) as { rows: T[] };
    return body.rows;
  }
}

async function meldingUit(antwoord: Response): Promise<string> {
  try {
    const body = (await antwoord.json()) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // Geen JSON; de statuscode is dan het beste dat we hebben.
  }

  return antwoord.status === 403
    ? 'Je hebt geen toegang tot deze gegevens.'
    : `De database gaf een fout (HTTP ${antwoord.status}).`;
}
