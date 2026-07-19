#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# fix-amplify-spa-rewrite.sh — make deep links return HTTP 200 (not 404) on the
# Amplify-hosted SPA, by adding the standard SPA "200 rewrite" catch-all.
#
# Without it, Amplify falls back to index.html via the S3 *404 error document*, so
# every refresh / deep link / bookmark — and the Screen Directory's live-preview
# iframes — answers 404 to browsers, bots, and uptime monitors (the page still
# loads; it's a status-code bug). See DEPLOY_AWS.md → Troubleshooting.
#
# Usage:  bash scripts/fix-amplify-spa-rewrite.sh [APP_ID]
#   APP_ID = the "d…" label in the …amplifyapp.com subdomain (default below).
# Prereqs: aws CLI configured (`aws configure`) with amplify:UpdateApp, and jq.
# Safe: reads the current custom rules, appends the SPA rule only if missing
# (never clobbers existing redirects), and prints the change before applying.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_ID="${1:-d3c7s4j5mgvl0k}"
# Standard Amplify SPA rewrite: any path without a file extension → /index.html (200).
SPA_SOURCE='</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>'

command -v aws >/dev/null 2>&1 || { echo "✗ aws CLI not found — install it and run 'aws configure' first."; exit 1; }
command -v jq  >/dev/null 2>&1 || { echo "✗ jq not found — install jq (e.g. 'brew install jq' / 'apt install jq')."; exit 1; }

echo "Amplify app: $APP_ID"
current="$(aws amplify get-app --app-id "$APP_ID" --query 'app.customRules' --output json 2>/dev/null || true)"
if [ -z "$current" ] || [ "$current" = "null" ]; then current='[]'; fi

echo "── current custom rules ──"
echo "$current" | jq .

if echo "$current" | jq -e '.[] | select(.target=="/index.html" and (.status|tostring)=="200")' >/dev/null 2>&1; then
  echo "✓ A 200 rewrite to /index.html already exists — nothing to do."
  exit 0
fi

# Append at the END so any existing, more-specific redirects still match first.
updated="$(echo "$current" | jq --arg s "$SPA_SOURCE" '. + [{source:$s, target:"/index.html", status:"200"}]')"
echo "── proposed custom rules ──"
echo "$updated" | jq .

read -r -p "Apply this to $APP_ID? [y/N] " ok
[ "${ok:-}" = "y" ] || { echo "Aborted — nothing changed."; exit 0; }

aws amplify update-app --app-id "$APP_ID" --custom-rules "$updated" >/dev/null
echo "✓ Applied. Amplify serves the new rules within a minute (no rebuild needed)."
echo "  Verify:  curl -sI \"https://main.${APP_ID}.amplifyapp.com/dashboard/\" | head -1   # expect HTTP/2 200"
