#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# KBiz360 — AWS Amplify CLI deploy helper
# ─────────────────────────────────────────────────────────────────────
# Usage:  bash scripts/deploy-amplify.sh
# Prereqs: amplify cli installed (`npm install -g @aws-amplify/cli`)
# ─────────────────────────────────────────────────────────────────────

set -e

if ! command -v amplify &> /dev/null; then
  echo "❌ Amplify CLI not found. Install with:"
  echo "    npm install -g @aws-amplify/cli"
  exit 1
fi

# Check if amplify is already initialized
if [ ! -d "amplify" ]; then
  echo "🚀 Initializing Amplify project..."
  amplify init \
    --yes \
    --frontend '{"frontend":"javascript","framework":"react","config":{"SourceDir":"src","DistributionDir":"dist","BuildCommand":"npm run build","StartCommand":"npm run dev"}}'

  echo "🌐 Adding hosting..."
  amplify add hosting
else
  echo "ℹ️  Amplify already initialized"
fi

echo "📤 Publishing to AWS Amplify..."
amplify publish --yes

echo ""
echo "✅ Deployment complete!"
echo "   Run 'amplify console' to open your app in the AWS Console"
