# KBiz360 — AWS Deployment Guide

This document covers three deployment paths on AWS. **Recommended for most users: AWS Amplify** (easiest with git-based CI/CD). For maximum cost efficiency, use **S3 + CloudFront**.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] **Node.js 20+ installed** locally (`node --version`)
- [ ] **AWS CLI v2 installed and configured** (`aws --version` and `aws configure`)
- [ ] **An AWS account** with appropriate IAM permissions
- [ ] **The build succeeds locally**: `npm install && npm run build` produces a `dist/` folder
- [ ] **Your custom domain** (optional) — registered or in Route 53

Test the build locally first:
```bash
npm install
npm run build
npm run preview     # Opens http://localhost:4173
```

If the preview works correctly, you're ready to deploy.

---

## Option 1 · AWS Amplify (Recommended — Easiest)

**Cost:** Free tier covers most small deployments. After free tier: ~$0.01/build-min + $0.15/GB egress.
**Best for:** Teams using GitHub/GitLab/Bitbucket; auto-deploy on every push.

### Step 1 · Push your code to a Git repository

```bash
cd kbiz360-app
git init
git add .
git commit -m "Initial KBiz360 deployment"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2 · Connect Amplify to your repo

1. Open the AWS Console → **AWS Amplify**
2. Click **"New app"** → **"Host web app"**
3. Choose your Git provider (GitHub / GitLab / Bitbucket / CodeCommit)
4. Authorize Amplify to access your repo
5. Select the `kbiz360-app` repo and the `main` branch

### Step 3 · Configure build settings

Amplify auto-detects Vite. Verify the build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Step 4 · Deploy

Click **"Save and deploy"**. First build takes ~3-5 minutes. Amplify gives you a URL like `https://main.d2abc123xyz.amplifyapp.com`.

### Step 5 · Custom domain (optional)

- In Amplify console → **Domain management** → **Add domain**
- Enter your domain (e.g., `kbiz360.travkings.com`)
- Amplify provisions an SSL certificate and DNS records automatically

### Step 6 · Configure SPA routing (important)

Since this is a single-page app with client-side routing, Amplify needs a redirect rule:

- In Amplify console → **Rewrites and redirects** → **Add rule**:
  - **Source address:** `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
  - **Target address:** `/index.html`
  - **Type:** `200 (Rewrite)`

---

## Option 2 · S3 + CloudFront (Cheapest)

**Cost:** Typically $1-3/month for low-traffic sites. S3 storage ~$0.023/GB + CloudFront egress ~$0.085/GB.
**Best for:** Cost-conscious deployments; no CI/CD needed.

### Step 1 · Build the app locally

```bash
npm install
npm run build
# Output goes to dist/
```

### Step 2 · Create an S3 bucket

```bash
# Replace YOUR_BUCKET_NAME with a globally-unique name
aws s3api create-bucket \
  --bucket YOUR_BUCKET_NAME \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Disable Block Public Access (needed for static site hosting)
aws s3api put-public-access-block \
  --bucket YOUR_BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### Step 3 · Configure static website hosting

```bash
aws s3 website s3://YOUR_BUCKET_NAME \
  --index-document index.html \
  --error-document index.html
```

(Using `index.html` as the error document ensures SPA routes work correctly.)

### Step 4 · Set bucket policy for public read

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

Apply it:
```bash
aws s3api put-bucket-policy --bucket YOUR_BUCKET_NAME --policy file://bucket-policy.json
```

### Step 5 · Upload the build

```bash
aws s3 sync dist/ s3://YOUR_BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# Upload index.html separately with no-cache (so updates appear immediately)
aws s3 cp dist/index.html s3://YOUR_BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

Your site is now available at `http://YOUR_BUCKET_NAME.s3-website.ap-south-1.amazonaws.com`.

### Step 6 · Add CloudFront for HTTPS + global CDN

1. AWS Console → **CloudFront** → **Create distribution**
2. **Origin domain:** Choose your S3 bucket's *website endpoint* (NOT the REST endpoint)
3. **Viewer protocol policy:** Redirect HTTP to HTTPS
4. **Allowed HTTP methods:** GET, HEAD, OPTIONS
5. **Default root object:** `index.html`
6. **Custom error responses** (critical for SPA):
   - 403 → `/index.html` with response code 200
   - 404 → `/index.html` with response code 200

### Step 7 · Add custom domain (optional)

1. Request an SSL cert in **AWS Certificate Manager** (must be in **us-east-1** for CloudFront)
2. In CloudFront distribution settings → **Alternate domain names** → add your domain
3. **SSL certificate:** Select your ACM cert
4. In **Route 53** → create an A-record (Alias) pointing to your CloudFront distribution

### Step 8 · One-command redeploys

Use the included script `scripts/deploy-s3.sh`:

```bash
# First time: edit the script to set your bucket name and CloudFront distribution ID
bash scripts/deploy-s3.sh
```

---

## Option 3 · Elastic Beanstalk (Server-Side Capability)

**Cost:** Starts at $0 for t3.micro (free tier), then ~$10-30/month for production.
**Best for:** When you later add a backend (Node.js/Express API alongside the React frontend).

Currently KBiz360 is a pure frontend app with embedded sample data, so Elastic Beanstalk is **overkill**. Consider this only when you add real database integration.

### Quick steps (if you go this route)

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-20 kbiz360-app --region ap-south-1

# Create environment
eb create kbiz360-prod --instance-type t3.small

# Deploy
eb deploy
```

You'd need to add an Express server (`server.js`) that serves the built React files.

---

## 🛡️ Security Recommendations

Before going live:

1. **Add Amazon WAF** (CloudFront firewall) to block common attacks (free tier: 10M requests/month)
2. **Enable AWS Shield Standard** (free DDoS protection — automatic with CloudFront)
3. **Set up CloudWatch alarms** for unusual traffic or errors
4. **Enable AWS Cost Explorer alerts** to avoid bill shock
5. **Restrict IAM roles** to minimum required permissions
6. **Use AWS Secrets Manager** for any API keys (don't hardcode in the React app)

---

## 💰 Cost Estimates (low-traffic deployment)

| Service | Estimated monthly cost |
|---|---|
| **Amplify** (1000 visitors/mo) | ~$1-3 |
| **S3 + CloudFront** (1000 visitors/mo) | ~$1-2 |
| **S3 + CloudFront** (100,000 visitors/mo) | ~$5-15 |
| **Elastic Beanstalk t3.small** | ~$15/month + traffic |
| **Route 53 hosted zone** | $0.50/month |
| **ACM SSL certificate** | Free |

For Travkings' current scale (9 users, internal use), expect **~$2-5/month total**.

---

## 🆘 Troubleshooting

### "Module not found: lucide-react / recharts"
Run `npm install` in the project directory before building.

### Build fails with "Out of memory"
Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

### SPA routes return a **404 status** on refresh / deep-link
The page still loads (Amplify falls back to `index.html` as the S3 *error document*),
but every deep link, refresh, bookmark — **and the Screen Directory's live-preview
iframes** (`/route?embed=1`) — answers with an HTTP **404 status** to browsers, bots,
and uptime monitors. Observed live on `main.d3c7s4j5mgvl0k.amplifyapp.com` (2026-07):
`/` → 200, but `/dashboard/`, `/reports/bs/?embed=1` → 404 (identical `index.html` body).
The query string survives, so previews still render — the 404 is a status-code bug.

Fix it with a proper SPA **200 rewrite** instead of the 404 error-document fallback:

**Amplify Console** → App settings → **Rewrites and redirects** → add this **above** any
other rule:

| Source address | Target address | Type |
|---|---|---|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` | `/index.html` | **200 (Rewrite)** |

**Or via CLI** (the app id is the `d…` label in the `…amplifyapp.com` subdomain):
```bash
bash scripts/fix-amplify-spa-rewrite.sh d3c7s4j5mgvl0k
```
It reads the app's current custom rules, ensures the SPA 200-rewrite is present
(without clobbering existing redirects), and prints the change before applying.

**CloudFront + S3 alternative:** distribution → **Error pages** → create custom error
responses mapping **403** and **404** → `/index.html` with a **200** response code.

### Browser shows blank screen with no errors
Check the browser console (F12). Common causes:
- Missing public assets — verify `/kbiz360_appicon.png` is in `public/`
- CSP / X-Frame-Options blocking. Verified 2026-07: the Amplify FE sends **neither**,
  so same-origin iframe framing (the **Screen Directory** live previews) works. If you
  later add security headers (`customHttp.yml` or a CloudFront response-headers policy),
  keep `Content-Security-Policy: frame-ancestors 'self'` — **never** `X-Frame-Options:
  DENY`/`frame-ancestors 'none'`, or the Screen Directory previews render blank.

### CloudFront serves outdated content after a deploy
You need to invalidate the cache:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```
(Or use `scripts/deploy-s3.sh` which does this automatically.)

---

## 📞 Need Help?

- AWS Amplify docs: https://docs.aws.amazon.com/amplify/
- S3 static hosting: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- CloudFront SPA setup: https://aws.amazon.com/blogs/networking-and-content-delivery/amazon-s3-amazon-cloudfront-a-match-made-in-the-cloud/

For KBiz360-specific support: `ad@travkings.com`
