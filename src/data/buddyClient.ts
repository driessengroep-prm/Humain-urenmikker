import { haalEntraToken, type EntraConfig } from './entraLogin';

/**
 * De verbinding met Buddy Data.
 *
 * Dit is bewust een klein, op zichzelf staand bestand en geen npm-pakket: de Urenmikker wordt door
 * GitHub Actions gebouwd met `npm ci` en heeft dus alleen toegang tot deze repo. Het spiegelt
 * `@driessen/buddy-client` uit agent-swarm; zodra dat pakket ergens gepubliceerd staat, kan dit
 * bestand daardoor vervangen worden zonder dat de dataStore hoeft te veranderen.
 *
 * Inloggen gaat met het Driessen-werkaccount: de gebruiker logt in bij Microsoft (zie
 * entraLogin.ts) en dat token ruilen we hier in bij Buddy voor een token dat de database begrijpt.
 * Er is dus geen apart account voor deze app, en wie in dienst komt kan meteen inloggen.
 *
 * Waarom twee tokens: Microsoft zegt wíe je bent, maar Postgres kent Microsoft niet. Het
 * Buddy-token zegt welke rol je in de database krijgt. Buddy is de vertaler.
 */

export interface BuddyConfig {
  /** Waar Buddy zelf draait; hier wordt het Microsoft-token ingewisseld. */
  buddyUrl: string;
  /** Waar de data-API draait; hier gaan de rijen heen en vandaan. */
  dataUrl: string;
  /** De korte naam van de database. */
  project: string;
  /** De app-registratie in Entra waarmee de medewerker inlogt. */
  entra: EntraConfig;
}

export class BuddyFout extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'BuddyFout';
  }
}

interface Token {
  waarde: string;
  verlooptOp: number;
}

const OPSLAGSLEUTEL = 'buddy_token';

export class BuddyClient {
  private token: Token | null = null;

  constructor(private readonly config: BuddyConfig) {}

  private get schema(): string {
    return `app_${this.config.project}`;
  }

  /**
   * Zorgt dat er een geldig token is. Kan de pagina laten navigeren naar het loginscherm van
   * Microsoft; in dat geval komt deze belofte niet meer terug en begint de app na terugkeer
   * opnieuw.
   */
  private async zorgVoorToken(): Promise<string> {
    if (this.token !== null && Date.now() < this.token.verlooptOp) {
      return this.token.waarde;
    }

    const bewaardToken = leesBewaardToken();
    if (bewaardToken !== null) {
      this.token = bewaardToken;
      return bewaardToken.waarde;
    }

    const entraToken = await haalEntraToken(this.config.entra);

    const antwoord = await fetch(`${this.config.buddyUrl}/api/buddy-data/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: entraToken,
        project: this.config.project,
      }),
    });

    if (!antwoord.ok) {
      throw new BuddyFout(
        antwoord.status === 403
          ? 'Je bent ingelogd bij Microsoft, maar hebt geen toegang tot deze gegevens.'
          : 'Inloggen bij Buddy Data mislukte.',
        antwoord.status,
      );
    }

    const body = (await antwoord.json()) as { access_token: string; expires_in: number };

    // Een minuut marge, zodat een token dat bij het versturen nog gold niet onderweg verloopt.
    const nieuw = { waarde: body.access_token, verlooptOp: Date.now() + (body.expires_in - 60) * 1000 };
    this.token = nieuw;
    bewaar(nieuw);

    return nieuw.waarde;
  }

  async verzoek<T>(
    pad: string,
    opties: { methode?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
  ): Promise<T> {
    const antwoord = await this.stuur(pad, opties, await this.zorgVoorToken());

    // Eén keer opnieuw met een vers token: een 401 betekent hier bijna altijd dat het token
    // verliep terwijl het tabblad open stond, en dat hoort de gebruiker niet te merken.
    if (antwoord.status === 401) {
      vergeetToken();
      this.token = null;
      return this.lees<T>(await this.stuur(pad, opties, await this.zorgVoorToken()));
    }

    return this.lees<T>(antwoord);
  }

  private stuur(
    pad: string,
    opties: { methode?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
    token: string,
  ): Promise<Response> {
    const schrijft = opties.methode !== undefined && opties.methode !== 'GET';

    return fetch(`${this.config.dataUrl.replace(/\/+$/, '')}${pad}`, {
      method: opties.methode ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        // De data-API bedient alle applicaties op één adres; deze header kiest de juiste.
        [schrijft ? 'Content-Profile' : 'Accept-Profile']: this.schema,
        ...(opties.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        // Zonder dit geeft de API bij schrijven een lege body terug en heb je het toegekende id
        // niet — precies wat je daarna nodig hebt.
        ...(schrijft ? { Prefer: 'return=representation' } : {}),
      },
      body: opties.body === undefined ? undefined : JSON.stringify(opties.body),
    });
  }

  private async lees<T>(antwoord: Response): Promise<T> {
    const tekst = await antwoord.text();

    if (!antwoord.ok) {
      let melding = `De database gaf een fout (HTTP ${antwoord.status}).`;
      try {
        const body = JSON.parse(tekst) as { message?: string; hint?: string };
        if (body.message) melding = [body.message, body.hint].filter(Boolean).join(' — ');
      } catch {
        // Geen JSON; de melding met de statuscode is dan het beste dat we hebben.
      }
      throw new BuddyFout(melding, antwoord.status);
    }

    return (tekst === '' ? undefined : JSON.parse(tekst)) as T;
  }
}

function bewaar(token: Token): void {
  try {
    sessionStorage.setItem(OPSLAGSLEUTEL, JSON.stringify(token));
  } catch {
    // Privémodus of geblokkeerde opslag: dan wordt er per tabblad opnieuw ingelogd.
  }
}

function leesBewaardToken(): Token | null {
  try {
    const ruw = sessionStorage.getItem(OPSLAGSLEUTEL);
    if (ruw === null) return null;

    const token = JSON.parse(ruw) as Token;
    return Date.now() < token.verlooptOp ? token : null;
  } catch {
    return null;
  }
}

function vergeetToken(): void {
  try {
    sessionStorage.removeItem(OPSLAGSLEUTEL);
  } catch {
    // Zie bewaar().
  }
}
