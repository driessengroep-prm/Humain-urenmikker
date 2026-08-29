# Nog te doen

## Een eigen Entra-registratie

De app logt in via de registratie **n8n SharePoint**
(`cb2c6818-aff1-4b27-b84b-df3373b158a1`). Die bestaat voor iets heel anders: n8n
dat bij SharePoint moet.

Technisch werkt het, maar je deelt één identiteit tussen twee losse dingen. Moet
die registratie ooit vervangen worden vanwege n8n — een secret gelekt, rechten
aangepast — dan valt de Urenmikker mee om, en niemand die dat verwacht.

Een eigen registratie kost een paar minuten en heeft niets nodig: geen secret,
geen Graph-rechten. Alleen:

- platform **Toepassing met één pagina**, met redirect-URI
  `https://urenmikker.driessengroep.nl/`
- beheerderstoestemming, zodat een medewerker niet zelf om machtigingen
  gevraagd wordt

Daarna de client-id vervangen op drie plekken: de repository-variabele
`ENTRA_CLIENT_ID`, `BUDDY_ENTRA_CLIENT_ID` in `~/brain-stack/.env` op de server,
en je eigen `.env`.

## Rollen, als "iedereen binnen Driessen" te ruim wordt

De pagina staat nu open voor iedereen met een Driessen-account. Wil je het
beperken, dan definieer je in Entra een app-rol en zet je de naam ervan in het
Buddy-beheerscherm bij deze pagina onder Instellingen.

Buddy leest die rol uit het token; toewijzen blijft in Entra. Er is dus geen
tweede rechtenadministratie.

## Afgerond

- **Publiceren naar het subdomein** — een push naar `main` publiceert nu naar
  zowel GitHub Pages als `urenmikker.driessengroep.nl`. Handmatig kan nog met
  `./scripts/publiceer.sh`.
- **Opslag in Buddy Data** — de use cases staan in de gedeelde tabel
  `app_urenmikker.use_cases`; wijzigingen blijven bestaan en collega's zien ze.
- **Inloggen met het werkaccount** — via Entra, zonder apart account en zonder
  sleutel in deze app.
