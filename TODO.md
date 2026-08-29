# Nog te doen

## Publiceren naar het subdomein automatiseren

`urenmikker.driessengroep.nl` wordt op dit moment **met de hand** gepubliceerd:

```bash
./scripts/publiceer.sh
```

Een push naar `main` publiceert alleen naar GitHub Pages. Wie het subdomein wil
bijwerken, moet dat script draaien — vergeet iemand dat, dan lopen de twee
adressen uiteen zonder dat iets erover klaagt.

Automatiseren kan met `.github/workflows/deploy-subdomein.yml` (staat klaar,
maar draait nog niet). Daarvoor is één ding nodig: een SSH-sleutel waarmee
GitHub Actions bij `buddy-admin@40.115.59.118` mag.

```bash
ssh-keygen -t ed25519 -f ~/urenmikker-deploy -N "" -C "github-actions urenmikker"
```

- publieke helft (`~/urenmikker-deploy.pub`) in `~/.ssh/authorized_keys` van
  `buddy-admin` op de VM
- private helft als repository-secret `VM_SSH_KEY`

Een eigen sleutel en niet je persoonlijke: met die van jou kan GitHub alles wat
jij op die server kunt.

## Entra invullen

De app logt in met het Driessen-werkaccount, maar de gegevens van de
app-registratie staan nog nergens:

- `VITE_ENTRA_CLIENT_ID` en `VITE_ENTRA_TENANT_ID` — lokaal in `.env`, en als
  repository-variabelen voor de Pages-build
- `BUDDY_ENTRA_TENANT_ID` en `BUDDY_ENTRA_CLIENT_ID` in `~/brain-stack/.env` op
  de server, zodat Buddy die tokens accepteert
- `https://urenmikker.driessengroep.nl/` als redirect-URI in de registratie

Zonder deze vier valt de app terug op `use-cases.json` en bewaart hij niets.
Het publiceerscript weigert dan te publiceren.
