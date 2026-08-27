#!/usr/bin/env bash
# Publiceert de Urenmikker naar urenmikker.driessengroep.nl.
#
# Met de hand, vanaf je eigen laptop, met je eigen SSH-sleutel. Zolang dat zo is,
# gebeurt publiceren alleen als jij het doet — een push naar main verandert daar niets aan.
# Zie TODO.md als je dit wilt automatiseren.
#
#   ./scripts/publiceer.sh
set -euo pipefail

DOEL="buddy-admin@40.115.59.118:/data/caddy/apps/urenmikker/"
ADRES="https://urenmikker.driessengroep.nl/"

# Het subdomein serveert onder /, GitHub Pages onder /Humain-urenmikker/. Dat pad zit in
# de gebouwde bestanden, dus die build is een andere dan die van Pages.
export BASE_PATH=/
export VITE_BUDDY_URL=https://buddy.driessengroep.nl
export VITE_BUDDY_DATA_URL=https://buddy.driessengroep.nl/data
export VITE_BUDDY_PROJECT=urenmikker
export VITE_ENTRA_CLIENT_ID="${VITE_ENTRA_CLIENT_ID:-}"
export VITE_ENTRA_TENANT_ID="${VITE_ENTRA_TENANT_ID:-}"

echo "▶ Bouwen"
rm -rf dist
npm run build

# Zonder de VITE_-variabelen snoeit Vite de hele datalaag weg als dode code en publiceer je
# stilzwijgend de versie die use-cases.json leest. Dat merk je pas als iemand belt dat zijn
# wijziging weg is.
if ! grep -rq "buddy.driessengroep.nl" dist/assets/*.js; then
  echo "✗ De build bevat geen verbinding met Buddy Data." >&2
  echo "  Zet VITE_ENTRA_CLIENT_ID en VITE_ENTRA_TENANT_ID (of zet ze in .env)." >&2
  exit 1
fi

echo "▶ Overzetten"
# --delete ruimt op wat uit de build verdwenen is. index.html gaat als laatste, zodat de
# browser nooit een pagina krijgt die naar nog-niet-aanwezige bestanden verwijst.
rsync -az --delete --exclude=index.html dist/ "$DOEL"
rsync -az dist/index.html "${DOEL}index.html"

echo "▶ Controleren"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$ADRES")
echo "  $ADRES → HTTP $code"
[ "$code" = "200" ] || { echo "✗ Niet bereikbaar." >&2; exit 1; }

echo "✓ Gepubliceerd."
