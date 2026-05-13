# `deploy/`

Production artefacts for WHM / cPanel at `/home/deskhubdranzo`.

| File | Purpose |
|---|---|
| `build.sh` | Builds API + Web and creates `dist-bundle.tar.gz` |
| `ecosystem.config.js` | PM2 process config — runs the API on `127.0.0.1:4010` |
| `.env.production` | Production env template (copy to `.env`, set JWT secrets, rotate DB creds) |
| `.htaccess` | Apache config for the SPA + reverse proxy to PM2 |
| `DEPLOY.md` | Full step-by-step deploy guide |

Quick start:
```bash
bash deploy/build.sh                                # produces dist-bundle.tar.gz
scp dist-bundle.tar.gz deskhubdranzo@HOST:/home/deskhubdranzo/
ssh deskhubdranzo@HOST
# then follow DEPLOY.md from step 3.
```
