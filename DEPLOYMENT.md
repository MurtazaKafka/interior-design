# Deployment Guide for artki.tech

This document captures a reproducible path for publishing the Interior Design platform to production at **https://artki.tech**.

---

## 1. Prerequisites

1. **Source Control**
   - Ensure the latest code is pushed to the `frontend` branch (or a dedicated `main`/`production` branch).
   - Render and Vercel can both deploy directly from GitHub.

2. **Environment Secrets**
   Collect the following values before creating services:

   | Variable | Description |
   | --- | --- |
   | `CHROMA_API_KEY` | ChromaDB Cloud API key |
   | `CHROMA_TENANT` | ChromaDB tenant/organization ID |
   | `CHROMA_DATABASE` | Database name (defaults to `taste-fingerprint`) |
   | `ANTHROPIC_API_KEY` | Claude 4.5 Sonnet API key |
   | `SKETCHFAB_TOKEN` | Token for retrieving Sketchfab assets (optional right now) |
   | `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed origins (production + staging URLs) |
   | `NEXT_PUBLIC_TASTE_API_URL` | Public URL of the FastAPI backend |
   | `NEXT_PUBLIC_FURNITURE_API_URL` | Same as above unless split |
   | `NEXT_PUBLIC_NERF_API_URL` | (Optional) URL of NeRF/mesh service when online |

3. **One-time Data Seeding**
   - The furniture catalog must be embedded into Chroma once per environment.
   - Run `python scripts/embed_furniture.py` from `taste-fingerprint/apps/serve` with the production environment configured (can be run locally and pointed at production Chroma).

---

## 2. Backend (FastAPI) on Render

Render blueprint: [`render.yaml`](./render.yaml)

### 2.1 Create the service

1. Log into [Render](https://dashboard.render.com) and add a **Blueprint** from your GitHub repo.
2. Select the `render.yaml` file in the root when prompted.
3. Confirm the service `taste-fingerprint-api` is detected with:
   - Python runtime 3.12
   - Build command: `pip install --upgrade pip && pip install -r apps/serve/requirements.txt`
   - Start command: `PYTHONPATH=. uvicorn apps.serve.main:app --host 0.0.0.0 --port 8000`

### 2.2 Configure environment variables

Add values for each secret listed above. For convenience, `CORS_ALLOW_ORIGINS` already defaults to the production domain in `render.yaml`; add staging URLs as needed (comma-separated).

### 2.3 Post-deploy checklist

- After the first deploy, visit `https://<render-service>.onrender.com/docs` to verify the API is live.
- Confirm `POST /taste/update` responds with 200 using the Render base URL.
- Update the frontend `.env` values to hit the Render base domain (e.g. `https://taste-fingerprint-api.onrender.com`).

> **Torch CVE note**: the current requirements pin `torch==2.3.1`. Upgrade to `torch>=2.6.0` before production so that CLIP embedding endpoints work without triggering the CVE guard rails (`pip install torch==2.6.0` and update `requirements.txt`).

---

## 3. Frontend (Next.js) on Vercel

1. Push the repo to GitHub if not already there.
2. Create a **New Project** in Vercel, importing the repository.
3. Set **Root Directory** to `artspace-interior/artspace-ui` during the import wizard.
4. Define environment variables under *Settings → Environment Variables*:
   - `NEXT_PUBLIC_TASTE_API_URL=https://taste-fingerprint-api.onrender.com`
   - `NEXT_PUBLIC_FURNITURE_API_URL=https://taste-fingerprint-api.onrender.com`
   - `NEXT_PUBLIC_NERF_API_URL` (optional until the service exists)
5. Use the default build/ install commands (`npm install`, `npm run build`). Vercel will detect Next.js automatically (config also lives in `vercel.json`).
6. After deployment, the preview URL should render the app with live API calls (taste quiz, etc.).

---

## 4. Custom Domain `artki.tech`

1. In Vercel project settings, add `artki.tech` and `www.artki.tech` under **Domains**.
2. If Vercel manages DNS:
   - Update your domain registrar nameservers to Vercel’s (recommended).
3. If managing DNS manually:
   - Create an `A` record for `artki.tech` pointing to `76.76.21.21` (Vercel edge).
   - Create a `CNAME` for `www` pointing to the Vercel project domain (e.g. `project-name.vercel.app`).
4. Wait for propagation and confirm HTTPS is issued automatically by Vercel.
5. Update `CORS_ALLOW_ORIGINS` on Render to include `https://artki.tech` and `https://www.artki.tech`.

> Optional: set up a Render custom domain for the API (e.g. `api.artki.tech`) via Render’s dashboard, then point a `CNAME` to the Render service.

---

## 5. Continuous Deployment

- **Vercel**: every push to the connected branch will trigger a new frontend build.
- **Render**: auto-deploy can be enabled per service, re-building the API when commits land.
- Consider creating a GitHub Actions workflow to run `npm run lint` and backend tests before deploying.

---

## 6. Smoke Test Checklist

After both services deploy and DNS propagates:

- Visit `https://artki.tech` and ensure the hero and taste fingerprint flows load.
- Run a taste selection to confirm `POST /taste/update` succeeds (no network errors in DevTools).
- Trigger “Generate full room” with a sample image; verify request returns success (after upgrading `torch`).
- Hit the backend docs at `https://taste-fingerprint-api.onrender.com/docs` (or custom domain) to ensure CORS and HTTPS are valid.

---

## 7. Future Enhancements

- Containerize the backend with a Dockerfile for more deterministic deployments.
- Add staging environments (e.g. `staging.artki.tech`).
- Automate data embedding via a Render one-off job or GitHub Action.
- Monitor usage with Render metrics and Vercel analytics.

Happy shipping! 🚀
