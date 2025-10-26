# Artki.tech Demo Runbook

Live walkthrough plan for showcasing the end-to-end experience described in the Devpost submission.

## 0. Prerequisites (T-10 minutes)

1. **Backend environment**
   - `cd taste-fingerprint/apps/serve`
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
   - Provide `.env` with:
     ```bash
     CHROMA_API_KEY=...
     CHROMA_TENANT=...
     CHROMA_DATABASE=taste-fingerprint
     ANTHROPIC_API_KEY=...
     OPENAI_API_KEY=...
     CORS_ALLOW_ORIGINS=http://localhost:3000
     ```
   - Prime vector stores (only once per environment):
     ```bash
     python scripts/embed_furniture.py
     ```

2. **Frontend environment**
   - `cd artspace-interior/artspace-ui`
   - `npm install`
   - `.env.local` (adjust ports if needed)
     ```bash
     NEXT_PUBLIC_API_BASE=http://localhost:8000
     NEXT_PUBLIC_FURNITURE_API_URL=http://localhost:8000
     NEXT_PUBLIC_RENDER_ROOM_URL=http://localhost:8000
     ```

3. **Launch services (T-5)**
   - Backend: `uvicorn taste-fingerprint.apps.serve.main:app --reload --port 8000`
   - Frontend: `npm run dev`
   - Optional NeRF stub (not required for pivoted flow).

## Verification Snapshot (as of Oct 26)

| Command | Result | Notes |
| --- | --- | --- |
| `python3 -m compileall taste-fingerprint/apps/serve/main.py` | ✅ Pass | Confirms merged FastAPI module has no syntax errors. |
| `npm install` (artspace-ui) | ✅ Pass | Dependencies resolve; 0 vulnerabilities reported. |
| `npm run --prefix artspace-interior/artspace-ui build` | ⚠️ Compiles then exits 130 | Build succeeds before signal; warning about multiple lockfiles can be ignored for demo. |
| `npm run --prefix artspace-interior/artspace-ui lint` | ⚠️ Known rule violations | React hook lint warnings in `HeroCanvas`, `ScrollArtwork`, `TasteFingerprint` (safe to acknowledge during demo). |
| `python3 -m pytest taste-fingerprint` | ⚠️ Blocked | Terminates early awaiting SSH key passphrase; run manually if agent unlocked. |

## 1. Demo Script (7–9 minutes)

### Act I – Floorplan ➜ Room Canvas (90s)
1. Navigate to `http://localhost:3000`.
2. Use the hero scroll interaction to transition into the studio.
3. Step 1 card: upload `artspace-interior/artspace-ui/assets/floorplan.png` (or any PNG floorplan).
4. Hit **Continue to Style Selection** – explain Claude will convert the plan into Three.js geometry downstream (handled by `CompleteRoomGenerator`).

### Act II – Taste Discovery (2 min)
1. Step 2 shows the **TasteFingerprint** quiz (`TasteFingerprint.tsx`).
2. Walk through 12 comparisons (Monet vs. Picasso, etc.) – each click hits:
   - `POST /taste/update`
   - `POST /taste/summarize`
   - ChromaDB stores the evolving 512-D vector.
3. Call out `taste-fingerprint/apps/serve/main.py` sections:
   - `_ensure_sequence`, `_collect_keywords`
   - `taste_summarize` (Claude summarization)
   - Metadata caching for subsequent recommendations.

### Act III – 3D Room Generation (3 min)
1. Step 3 reveals `CompleteRoomGenerator` canvas (OrbitControls + dynamic injections).
2. Press the **Spark Room** button (if available) or upload a style image to trigger `/render/room`.
   - Backend flow (`render_room`):
     - Fetch user vector → `_query_products_by_vector`
     - Call Claude for recommendations via `recommend_products`
     - Compose OpenAI prompt → edit uploaded room photo
     - Cache generated PNG in `/generated`
3. Mention fallback behaviour: if Anthropic key missing, generator returns stored templates (`Claude3DGenerator._get_fallback_code`).

### Bonus – Product Catalog (optional, 90s)
1. Show `/products/recommend` in a REST client (see snippet in Appendix) to highlight real product metadata.
2. Emphasize Amazon scraping scripts under `taste-fingerprint/packages/catalog` and enhanced embeddings pipeline.

## 2. Troubleshooting Fastlane

| Issue | Rapid Response |
| --- | --- |
| Claude/OpenAI credentials missing | `render_room` & 3D generation gracefully fall back; mention pivot story and show fallback code running. |
| Chroma invalid collection | Run `python scripts/embed_furniture.py` again. |
| Frontend build warning about lockfiles | Safe to ignore for demo (Next.js turbopack picking root). |
| ESLint complaining about hook patterns | Known WIP warnings (`HeroCanvas`, `ScrollArtwork`, `TasteFingerprint`); demo unaffected. |
| Network CORS errors | Ensure `CORS_ALLOW_ORIGINS` matches actual frontend origin; restart backend after edits. |

## 3. Appendix

### Key Feature ↔ Code Mapping

| Demo Beat | Frontend | Backend |
| --- | --- | --- |
| Floorplan upload → preview | `FloorplanUploader.tsx`, `CompleteRoomGenerator.tsx` | `craft_room_edit_prompt`, `render_room` |
| Taste fingerprint quiz | `TasteFingerprint.tsx`, `ScrollArtwork.tsx` | `/taste/update`, `/taste/summarize`, `_get_cached_taste_summary` |
| Product recommendations | `Claude3DViewer.tsx`, `CompleteRoomGenerator.tsx` | `/products/recommend`, `_merge_scores`, `_query_products_by_vector` |
| 3D rendering pipeline | `CompleteRoomGenerator.tsx` (Three.js injection) | `Claude3DGenerator`, `room-generator.ts` |
| Amazon data ingestion | `lib/furniture-api.ts` consumption | `packages/catalog/*.json`, `scripts/embed_furniture.py` |

### Helpful API Invocations

```bash
# Taste summary (after quiz)
curl -X POST http://localhost:8000/taste/summarize \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "demo_user", "top_k": 12, "vector_preview": 12}'

# Product recommendations
curl -X POST http://localhost:8000/products/recommend \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "demo_user", "limit": 5, "candidate_pool": 32}'

# Render room image (requires floorplan upload path + taste summary)
curl -X POST http://localhost:8000/render/room \
  -F 'user_id=demo_user' \
  -F 'room_image=@/path/to/floorplan.png'
```

### Talking Points Cheat Sheet
- Swapped NeRF for Claude-generated Three.js → 30 minutes ➜ 3 seconds.
- Taste vector math: `user_vec = user_vec + win_vec - 0.5 * lose_vec` (see `taste_update`).
- Real product metadata lives in ChromaDB with embeddings for <100 ms recalls.
- Error handling: fallback GLB/Three.js snippets ensure demo never blocks.

Good luck! Keep the narrative anchored on “Spotify for interior taste + instant Claude-powered visualization.”
