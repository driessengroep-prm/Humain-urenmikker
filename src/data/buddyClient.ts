/**
 * De verbinding met Buddy Data.
 *
 * Dit is bewust een klein, op zichzelf staand bestand en geen npm-pakket: de Urenmikker wordt door
 * GitHub Actions gebouwd met `npm ci` en heeft dus alleen toegang tot deze repo. Het spiegelt
 * `@driessen/buddy-client` uit agent-swarm; zodra dat pakket ergens gepubliceerd staat, kan dit
 * bestand daardoor vervangen worden zonder dat de dataStore hoeft te veranderen.
 *
 * Inloggen gaat via een omweg, en dat is met opzet. De sessiecookie van Buddy staat op
 * SameSite=Lax en gaat dus niet mee met een verzoek vanaf github.io — precies waar die instelling
 * voor bedoeld is. In plaats daarvan gebruiken we de standaard voor een app die geen geheim kan
 * bewaren: OAuth 2.0 authorization code met PKCE (RFC 7636). De gebruiker gaat eenmalig naar Buddy
 * (een gewone paginanavigatie, waarbij de cookie wél meegaat) en komt terug met een code. Die code
 * is waardeloos zonder de verifier die alleen dit tabblad heeft; het token zelf komt daarna over
 * een POST en staat dus nergens in een adresbalk of in een logregel.
 */

export interface BuddyConfig {
  /** Waar Buddy zelf draait; hier wordt ingelogd. */
  buddyUrl: string;
  /** Waar de data-API draait; hier gaan de rijen heen en vandaan. */
  dataUrl: string;
  /** De korte naam van de database. */
  project: string;
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
const PKCE_SLEUTEL = 'buddy_pkce';

export class BuddyClient {
  private token: Token | null = null;

  constructor(private readonly config: BuddyConfig) {}

  private get schema(): string {
    return `app_${this.config.project}`;
  }

  /**
   * Zorgt dat er een geldig token is. Kan de pagina laten navigeren naar Buddy; in dat geval komt
   * deze belofte niet meer terug en wordt de app na terugkeer opnieuw geladen.
   */
  private async zorgVoorToken(): Promise<string> {
    if (this.token !== null && Date.now() < this.token.verlooptOp) {
      return this.token.waarde;
    }

    const teruggekeerd = await ruilCodeIn(this.config.buddyUrl);
    if (teruggekeerd !== null) {
      this.token = teruggekeerd;
      bewaar(teruggekeerd);
      return teruggekeerd.waarde;
    }

    const bewaardToken = leesBewaardToken();
    if (bewaardToken !== null) {
      this.token = bewaardToken;
      return bewaardToken.waarde;
    }

    const verifier = willekeurigeTekst();
    const state = willekeurigeTekst();
    const terug = window.location.href.split('#')[0].split('?')[0];

    // In sessionStorage: de pagina navigeert weg en komt als nieuwe pagina terug, dus een
    // variabele zou de verifier niet overleven.
    sessionStorage.setItem(PKCE_SLEUTEL, JSON.stringify({ verifier, state, redirectUri: terug }));

    const query = new URLSearchParams({
      project: this.config.project,
      redirectUri: terug,
      codeChallenge: await s256(verifier),
      codeChallengeMethod: 'S256',
      state,
    });

    window.location.assign(`${this.config.buddyUrl}/api/buddy-data/authorize?${query}`);

    // De pagina vertrekt. Deze belofte lost bewust niet op: anders zou de app doorgaan met
    // renderen terwijl de browser al weg navigeert.
    return new Promise<string>(() => {});
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

/** Wisselt de code uit de terugkeer-URL in voor een token. Null = we komen hier niet net vandaan. */
async function ruilCodeIn(buddyUrl: string): Promise<Token | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code === null) return null;

  const bewaardePoging = sessionStorage.getItem(PKCE_SLEUTEL);
  sessionStorage.removeItem(PKCE_SLEUTEL);
  if (bewaardePoging === null) throw new BuddyFout('Deze inlogpoging hoort niet bij dit tabblad.');

  const { verifier, state, redirectUri } = JSON.parse(bewaardePoging) as {
    verifier: string; state: string; redirectUri: string;
  };

  // Zonder deze controle kan iemand jou zijn code laten inwisselen, en zit je in zijn gegevens te
  // kijken zonder het te merken.
  if (params.get('state') !== state) throw new BuddyFout('De inlogpoging klopt niet.');

  // De code uit de adresbalk halen vóór het inwisselen: hij is eenmalig en hoort niet in de
  // geschiedenis te blijven staan.
  params.delete('code');
  params.delete('state');
  const rest = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));

  const antwoord = await fetch(`${buddyUrl}/api/buddy-data/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!antwoord.ok) throw new BuddyFout('Inloggen bij Buddy Data mislukte.', antwoord.status);

  const body = (await antwoord.json()) as { access_token: string; expires_in: number };

  // Een minuut marge, zodat een token dat bij het versturen nog gold niet onderweg verloopt.
  return { waarde: body.access_token, verlooptOp: Date.now() + (body.expires_in - 60) * 1000 };
}

/** 32 willekeurige bytes als base64url — voldoet aan de lengte-eis voor een code_verifier. */
function willekeurigeTekst(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function s256(waarde: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(waarde));
  return base64url(new Uint8Array(digest));
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
