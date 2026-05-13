#!/usr/bin/env bash
# Build a deployable bundle locally (or on the server).
# Output:
#   apps/api/dist           -> Node API
#   apps/web/dist           -> Static SPA
#   dist-bundle.tar.gz      -> Single archive for scp/rsync
#
# Run from repo root:
#   bash deploy/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing deps (production-ready)"
npm install

echo "==> Building API"
npm --workspace apps/api run build

echo "==> Building Web"
npm --workspace apps/web run build

echo "==> Copying .htaccess into web dist"
cp deploy/.htaccess apps/web/dist/.htaccess

echo "==> Creating dist-bundle.tar.gz"
rm -f dist-bundle.tar.gz
tar -czf dist-bundle.tar.gz \
  apps/api/dist \
  apps/api/package.json \
  apps/web/dist \
  package.json \
  package-lock.json \
  deploy/ecosystem.config.js \
  deploy/.env.production

echo ""
echo "Done. Upload dist-bundle.tar.gz to /home/deskhubdranzo and follow deploy/DEPLOY.md"
