# Deploy — WHM/cPanel @ `/home/deskhubdranzo` with PM2

Target layout on the server:

```
/home/deskhubdranzo/
├── dranzo-payments/         # the Node app + repo
│   ├── apps/api/dist/       # built NestJS
│   ├── apps/web/dist/       # built React (also mirrored to public_html)
│   ├── deploy/
│   ├── .env                 # production secrets — chmod 600
│   └── node_modules/
├── public_html/             # Apache document root for the domain
│   ├── index.html           # from apps/web/dist
│   ├── assets/
│   └── .htaccess            # from deploy/.htaccess
└── logs/                    # PM2 logs
```

Apache reverse-proxies `/api/*` → `http://127.0.0.1:4010/api/*`.
Everything else is served as a static SPA.

---

## 0. Prereqs (one-time on server)

| Item | Notes |
|---|---|
| Node 20+ | Verify: `node -v`. WHM usually exposes via `nvm` or NodeJS Selector. |
| PM2 | Already installed per the brief. Verify: `pm2 -v`. |
| Apache modules | `mod_proxy`, `mod_proxy_http`, `mod_rewrite`, `mod_headers`, `mod_deflate`. Default on WHM. Check via WHM → EasyApache 4. |
| MySQL reachability | The server must reach `167.86.105.17:3306`. Test: `nc -vz 167.86.105.17 3306`. |
| SSH access | As user `deskhubdranzo` (cPanel user). |

---

## 1. Build locally (or on the server)

From the repo root on your laptop:

```bash
bash deploy/build.sh
```

That produces `dist-bundle.tar.gz` containing:
- `apps/api/dist/`
- `apps/web/dist/`
- `apps/api/package.json`, root `package.json`, `package-lock.json`
- `deploy/ecosystem.config.js`
- `deploy/.env.production`

Total ~20 MB.

---

## 2. Upload to the server

```bash
scp dist-bundle.tar.gz deskhubdranzo@YOUR.SERVER:/home/deskhubdranzo/
```

Or use cPanel **File Manager → Upload** into `/home/deskhubdranzo/`.

---

## 3. Unpack + install runtime deps on the server

```bash
ssh deskhubdranzo@YOUR.SERVER
cd /home/deskhubdranzo
mkdir -p dranzo-payments logs
tar -xzf dist-bundle.tar.gz -C dranzo-payments
cd dranzo-payments
npm install --omit=dev
```

`--omit=dev` skips Nest CLI, Vite, ts-node, etc. The compiled `dist/main.js` only needs runtime deps.

---

## 4. Configure `.env`

```bash
cd /home/deskhubdranzo/dranzo-payments
cp deploy/.env.production .env
chmod 600 .env
nano .env
```

Edit:
- `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`
  - Generate two values: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `WEB_URL` / `API_URL` → your real `https://your.domain`
- Confirm `DB_*` matches dev (already pre-filled per the brief)
- `BCRYPT_ROUNDS=14` for prod

> Security: rotate the MySQL `root` password once the app is live. Create a least-privilege `dranzo_app` user with grants only on the `dp` schema.

---

## 5. Run the initial migration

```bash
cd /home/deskhubdranzo/dranzo-payments
npx ts-node --transpile-only apps/api/src/database/run-migrations.ts
```

(One-time. If you prefer not to ship TypeScript source, see "Pre-compiled migrations" at the bottom.)

Optional seed:
```bash
npx ts-node apps/api/src/database/seeds/run-seed.ts
```

---

## 6. Start the API with PM2

```bash
cd /home/deskhubdranzo/dranzo-payments
pm2 start deploy/ecosystem.config.js
pm2 save                       # persists across reboots
pm2 startup                    # ONLY first time — copy/run the printed command as root
pm2 status                     # should show dranzo-api online
pm2 logs dranzo-api --lines 50 # confirm API listening on port 4010
```

Quick test from the server:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4010/api/docs   # expect 200
```

---

## 7. Publish the SPA to `public_html`

```bash
cd /home/deskhubdranzo
rm -rf public_html/*           # CAREFUL: only if this domain hosts only this app
cp -r dranzo-payments/apps/web/dist/. public_html/
cp dranzo-payments/deploy/.htaccess public_html/.htaccess
chmod 644 public_html/.htaccess
```

---

## 8. Smoke test from the public URL

Browser:
- `https://your.domain/` → React app, should redirect to `/login`
- `https://your.domain/api/docs` → Swagger from the Node app (Apache → PM2)
- Sign in with `admin@dranzo.test` / `Admin@123` if seeded

curl:
```bash
curl -s https://your.domain/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@dranzo.test","password":"Admin@123"}'
```

---

## 9. Updates / redeploy

Local:
```bash
bash deploy/build.sh
scp dist-bundle.tar.gz deskhubdranzo@YOUR.SERVER:/home/deskhubdranzo/
```

Server:
```bash
cd /home/deskhubdranzo
tar -xzf dist-bundle.tar.gz -C dranzo-payments
cd dranzo-payments
npm install --omit=dev
pm2 reload dranzo-api          # zero-downtime
# republish SPA
cp -r apps/web/dist/. ../public_html/
cp deploy/.htaccess ../public_html/.htaccess
```

If a new migration is included:
```bash
npx ts-node --transpile-only apps/api/src/database/run-migrations.ts
pm2 reload dranzo-api
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| 502 on `/api/*` | PM2 dropped. `pm2 logs dranzo-api`, restart with `pm2 restart dranzo-api`. |
| 503 / "AH00898: Error reading from remote server" | `mod_proxy_http` not enabled in EasyApache, or API_PORT mismatch with `.htaccess`. |
| `EADDRINUSE :4010` | Another process owns 4010. `lsof -i :4010` then kill, or pick a different port (update both ecosystem.config.js and .htaccess). |
| `ETIMEDOUT` on MySQL | Remote DB blocked the cPanel server's IP. Whitelist it in the MySQL firewall, then `pm2 restart dranzo-api`. |
| `Authorization` header missing in API | Apache stripping it. The `.htaccess` re-adds via `SetEnvIf Authorization`. Confirm the rule is present. |
| Refresh on `/clients` returns 404 | SPA fallback missing. Confirm `.htaccess` is in `public_html` and `mod_rewrite` is enabled. |
| JWT fails after redeploy | Secrets in `.env` were regenerated; users need to log in again. Expected. |

---

## Pre-compiled migrations (optional, drops ts-node need on server)

Add to `apps/api/package.json` scripts before `build.sh`:

```json
"build:migrations": "tsc -p tsconfig.json --outDir dist-migrations --noEmit false"
```

Then on server:
```bash
node apps/api/dist-migrations/database/run-migrations.js
```

This keeps the server free of TypeScript dev tools entirely.
