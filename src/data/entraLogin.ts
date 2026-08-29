import { PublicClientApplication } from '@azure/msal-browser';
import type { AccountInfo } from '@azure/msal-browser';

/**
 * Inloggen met het Driessen-werkaccount.
 *
 * De medewerker heeft geen apart account voor deze app nodig; wie bij Driessen werkt kan erin.
 * Microsoft bepaalt of dat zo is — inclusief MFA en conditional access — en wij nemen dat oordeel
 * over. Wat wij van hem terugkrijgen is een ID-token, en dat ruilen we bij Buddy in voor een token
 * dat de database begrijpt.
 *
 * Op een werklaptop merkt de gebruiker hier meestal niets van: hij is al ingelogd bij Microsoft,
 * dus het gaat vanzelf.
 */
export interface EntraConfig {
  clientId: string;
  tenantId: string;
}

let app: PublicClientApplication | null = null;

async function zorgVoorApp(config: EntraConfig): Promise<PublicClientApplication> {
  if (app !== null) return app;

  app = new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      // Terugkomen waar je was. Moet exact zo in de app-registratie staan, anders weigert
      // Microsoft de omleiding.
      redirectUri: window.location.origin + window.location.pathname,
    },
    cache: {
      // In sessionStorage en niet in localStorage: sluit je het tabblad, dan is de sessie weg.
      // Op een gedeelde werkplek is dat het verschil tussen wel en niet uitgelogd zijn.
      cacheLocation: 'sessionStorage',
    },
  });

  await app.initialize();

  // Komen we net terug van het loginscherm, dan zit het antwoord in de URL. Dit haalt het eruit
  // en ruimt de adresbalk op.
  await app.handleRedirectPromise();

  return app;
}

/**
 * Geeft een ID-token van Microsoft. Kan de pagina laten navigeren naar het loginscherm; in dat
 * geval komt deze belofte niet meer terug en begint de app na terugkeer opnieuw.
 */
export async function haalEntraToken(config: EntraConfig): Promise<string> {
  const msal = await zorgVoorApp(config);
  const scopes = ['openid', 'profile'];

  const account: AccountInfo | null = msal.getAllAccounts()[0] ?? null;

  if (account !== null) {
    try {
      const resultaat = await msal.acquireTokenSilent({ scopes, account });
      return resultaat.idToken;
    } catch (fout) {
      // Stil vernieuwen gaat via een verborgen iframe en kan op allerlei manieren stuklopen:
      // geblokkeerde cookies van derden, een iframe die niet terugmeldt, een verlopen sessie.
      // Wat de reden ook is, opnieuw inloggen lost het op — en dat is minder erg dan een
      // foutmelding waar de gebruiker niets mee kan. De reden gaat wel naar de console.
      console.warn('Stil vernieuwen mislukte, opnieuw inloggen:', fout);
    }
  }

  await msal.loginRedirect({ scopes });

  // De pagina vertrekt.
  return new Promise<string>(() => {});
}

/** Het e-mailadres van wie er ingelogd is, voor in de UI. Null als er niemand is. */
export async function ingelogdeGebruiker(config: EntraConfig): Promise<string | null> {
  const msal = await zorgVoorApp(config);
  return msal.getAllAccounts()[0]?.username ?? null;
}
