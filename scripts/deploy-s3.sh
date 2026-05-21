#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# KBiz360 — One-command S3 + CloudFront deploy
# ─────────────────────────────────────────────────────────────────────
# Usage:  bash scripts/deploy-s3.sh
# Prereqs: aws cli configured (`aws configure`); bucket already created
# ─────────────────────────────────────────────────────────────────────

set -e

# ⚙️  EDIT THESE FOR YOUR DEPLOYMENT
BUCKET_NAME="your-bucket-name-here"
CLOUDFRONT_DISTRIBUTION_ID=""    # leave empty if not using CloudFront
AWS_REGION="ap-south-1"

# ─────────────────────────────────────────────────────────────────────

echo "🔨 Building KBiz360 for production..."
npm run build

echo "📤 Uploading to s3://${BUCKET_NAME}/ ..."

# Upload all static assets with long cache (immutable)
aws s3 sync dist/ "s3://${BUCKET_NAME}/" \
  --region "${AWS_REGION}" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# Upload index.html separately with no-cache (so updates appear immediately)
aws s3 cp dist/index.html "s3://${BUCKET_NAME}/index.html" \
  --region "${AWS_REGION}" \
  --cache-control "no-cache, no-store, must-revalidate"

# Invalidate CloudFront cache if distribution ID is set
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" \
    --output text > /dev/null
  echo "✓ CloudFront cache invalidated"
fi

echo ""
echo "✅ Deployment complete!"
echo "   Bucket: s3://${BUCKET_NAME}/"
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "   CloudFront: https://YOUR-DOMAIN.cloudfront.net (changes propagate in ~5 min)"
else
  echo "   URL: http://${BUCKET_NAME}.s3-website.${AWS_REGION}.amazonaws.com"
fi
