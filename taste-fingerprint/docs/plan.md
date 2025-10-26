# Taste Fingerprint + Furnishing MVP — Build Documentation

This doc is a copy‑pasteable blueprint to implement the ML‑driven furniture recommender with LLM planning, Chroma DB retrieval, and deterministic placement — optimized for a 36‑hour hackathon and Cursor.

---

## 0) High‑Level Architecture

**Frontend (Next.js + React Three Fiber)**

* Onboarding (24‑image A/B picker) → produces a 512‑D taste vector `v_user`.
* Room intake (RoomPlan USDZ upload **or** simple param box editor).
* Scene viewer (r3f): auto‑furnish + drag/swap; shopping list.

**Backend (Python FastAPI)**

* `/embed/*` — CLIP image/text embeddings.
* `/taste/update` — update `v_user` from A/B choice.
* `/catalog/search` — Chroma vector search + metadata filters.
* `/plan/ops` — LLM "planner" that turns requests into SceneOps JSON (calls `/catalog/search`).
* `/placement/auto` — greedy, rule‑based layout with collision checks.

**Data Layer (Chroma DB, persistent)**

* Collections: `moodboards` (24), `products` (~150), `users` (optional, store `v_user`).
* Space: cosine.

**LLM (tool‑calling)**

* LLM = conductor that requests shortlists via `search_catalog` tool and returns SceneOps ops. No catalog in‑prompt.

---

## 1) Repo Structure (monorepo)

```
.
├─ apps/
│  ├─ web/                   # Next.js (TS) + react-three-fiber
│  └─ serve/                 # FastAPI (Python) + Chroma + CLIP
├─ packages/
│  ├─ scene-dsl/             # Shared types for SceneOps JSON
│  └─ catalog/               # JSON & scripts for product ingestion
└─ README.md
```

**Cursor note:** open the monorepo root; Cursor can navigate TS + Python. Use devcontainers if you want.

---

## 2) Environment & Setup

### 2.1 Prereqs

* Node 20+
* Python 3.10+
* `pip install -r apps/serve/requirements.txt`
* `npm i` in `apps/web`

### 2.2 Env Vars

Create `.env` files:

* `apps/serve/.env`:

```
CHROMA_PATH=./chroma_data
OPENAI_API_KEY=...           # only if using an LLM
```

* `apps/web/.env.local` (if calling LLM directly from web, usually not):

```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 3) Catalog & Moodboard Data

### 3.1 The 24 Onboarding Images (IDs + titles)

Use these as generator prompts or stock search keywords.

**Full‑Room Styles (6)**

* `room_modern` – Modern minimalist living room, white walls, black accents, oak floor, large sofa
* `room_japandi` – Japandi living room, light wood, linen sofa, neutral palette, paper lantern
* `room_midcentury` – Mid‑century living room, walnut furniture, tapered legs, warm tones
* `room_industrial` – Industrial loft, exposed brick, metal frames, leather sofa
* `room_boho` – Bohemian living room, rattan chair, plants, colorful textiles
* `room_contemporary` – Contemporary luxe living room, marble coffee table, brass lighting

**Materials & Textures (6)**

* `mat_wood` – Light oak plank texture flat lay
* `mat_walnut` – Dark walnut grain close‑up
* `mat_marble` – White marble slab with gray veining
* `mat_boucle` – Beige boucle fabric macro texture
* `mat_concrete` – Polished concrete surface texture
* `mat_rattan` – Woven cane rattan pattern close‑up

**Color Palettes (4)**

* `pal_warmneutral` – Warm neutral flat lay beige/sand/taupe fabrics
* `pal_coolgrey` – Cool grey minimal palette, stone textures
* `pal_earthy` – Terracotta/olive natural fiber palette
* `pal_bold` – Bold accents cobalt/mustard palette vignette

**Furniture Silhouettes (4)**

* `furn_sofa_curved` – Curved cloud sofa in neutral room
* `furn_sofa_rect` – Rectilinear track‑arm sofa, sharp lines
* `furn_table_round` – Round wooden coffee table, pedestal base
* `furn_table_rect` – Rectangular glass coffee table, metal legs

**Lighting & Ambience (2)**

* `light_warm` – Cozy warm ambient lighting interior (2700K)
* `light_bright` – Bright diffuse daylight, large window

**Art & Vibe (2)**

* `art_abstract` – Abstract canvas painting, neutral tones, texture
* `art_botanical` – Botanical line drawing/plant print, minimal

### 3.2 Moodboard JSON schema (store in `packages/catalog/moodboards.json`)

```json
[
  {
    "id": "room_modern",
    "facet": "room",
    "title": "Modern minimalist living room",
    "tags": ["modern","minimal","living"],
    "image_url": "/moodboards/room_modern.jpg"
  }
]
```

### 3.3 Product Catalog JSON schema (`packages/catalog/products.json`)

```json
[
  {
    "id": "sku_sofa_001",
    "name": "Lounge Sofa 84in",
    "retailer": "IKEA",
    "price": 899.0,
    "url": "https://...",
    "roomTypes": ["living"],
    "category": "sofa",
    "dims_in": {"w":84, "d":36, "h":32},
    "styleTags": ["modern","scandinavian"],
    "colors": ["beige","oak"],
    "image": "/products/sofa_001.jpg",
    "gltf": "/models/sofa_001.glb",
    "w": 84,
    "d": 36,
    "h": 32
  }
]
```

> Duplicate numeric width/height at top level (`w`, `d`, `h`) — makes Chroma metadata filtering easy.

### 3.4 Artwork metadata snippets (`packages/catalog/artworks.json`)

Each artwork entry now supports additional lean fields for taste summaries and Claude prompts:

```json
{
  "id": "...",
  "title": "...",
  "artist": "...",
  "museum": "...",
  "image_url": "...",
  "style_tags": ["renaissance_classic", "figurative"],
  "palette_keywords": ["warm_earth", "olive_green"],
  "material_inspirations": ["carved_oak", "linen_drapery"],
  "mood_keywords": ["serene", "contemplative"]
}
```

All lists are short (3–5 items) so Claude can verbalize the vector without manual pruning. After editing this file, run `python apps/serve/scripts/embed_artworks.py` to sync embeddings + metadata into Chroma Cloud.

---

## 4) Backend — FastAPI + Chroma + CLIP

### 4.1 Requirements (`apps/serve/requirements.txt`)

```
fastapi
uvicorn[standard]
pydantic
chromadb
numpy
pillow
torch
transformers
scikit-learn
python-dotenv
anthropic
```

### 4.2 App bootstrap (`apps/serve/main.py`)
# Claude summarization endpoint

```python
@app.post("/taste/summarize")
def taste_summarize(payload: TasteSummaryRequest):
    # fetch user vector + top artworks, aggregate metadata
    # call Claude via apps.serve.services.claude.summarize_taste
    # return multi-tone JSON (concise, poetic, planner_brief, plus palette/style summaries)
```

Environment variables:

```
ANTHROPIC_API_KEY=...
# optional override
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

Example request:

```bash
curl -X POST http://localhost:8000/taste/summarize \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"demo-user","top_k":6,"vector_preview":12}'
```


```python
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os, numpy as np, chromadb

load_dotenv()
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_data")

app = FastAPI(title="FurnishML API")
client = chromadb.PersistentClient(path=CHROMA_PATH)

products = client.get_or_create_collection(name="products", metadata={"hnsw:space":"cosine"})
moodboards = client.get_or_create_collection(name="moodboards", metadata={"hnsw:space":"cosine"})
users = client.get_or_create_collection(name="users", metadata={"hnsw:space":"cosine"})

# --- Embedding model ---
from transformers import CLIPProcessor, CLIPModel
import torch
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
model.eval()

def emb_image(pil_img):
    with torch.no_grad():
        inputs = processor(images=pil_img, return_tensors="pt")
        vec = model.get_image_features(**inputs)
        v = vec[0].cpu().numpy().astype("float32")
        v /= np.linalg.norm(v) + 1e-9
        return v

def emb_text(text):
    with torch.no_grad():
        inputs = processor(text=[text], return_tensors="pt", padding=True)
        vec = model.get_text_features(**inputs)
        v = vec[0].cpu().numpy().astype("float32")
        v /= np.linalg.norm(v) + 1e-9
        return v

# --- Taste vector update ---
class TasteUpdate(BaseModel):
    user_id: str
    win_id: str
    lose_id: str | None = None

@app.post("/taste/update")
def taste_update(p: TasteUpdate):
    u = users.get(ids=[p.user_id], include=["embeddings"])  # might be empty
    v = None if len(u.get("embeddings", []))==0 else np.array(u["embeddings"][0], dtype="float32")

    mb = moodboards.get(ids=[p.win_id] + ([p.lose_id] if p.lose_id else []), include=["embeddings"])
    win_vec = np.array(mb["embeddings"][0], dtype="float32")
    lose_vec = np.array(mb["embeddings"][1], dtype="float32") if p.lose_id else None

    if v is None:
        v = win_vec
    else:
        v = v + win_vec
    if lose_vec is not None:
        v = v - 0.5*lose_vec
    v = v / (np.linalg.norm(v) + 1e-9)

    users.upsert(ids=[p.user_id], embeddings=[v.tolist()], metadatas=[{}])
    return {"ok": True}

# --- Catalog search ---
class SearchReq(BaseModel):
    user_id: str | None = None
    category: str
    roomType: str | None = None
    styleTags: list[str] | None = None
    budget: float | None = None
    minWidthIn: float | None = None
    maxWidthIn: float | None = None
    limit: int = 12

@app.post("/catalog/search")
def catalog_search(q: SearchReq):
    where = {"category": q.category}
    if q.roomType: where["roomTypes"] = {"$contains": q.roomType}
    if q.budget is not None: where["price"] = {"$lte": q.budget}
    if q.minWidthIn is not None or q.maxWidthIn is not None:
        wcond = {}
        if q.minWidthIn is not None: wcond["$gte"] = float(q.minWidthIn)
        if q.maxWidthIn is not None: wcond["$lte"] = float(q.maxWidthIn)
        where["w"] = wcond
    if q.styleTags: where["styleTags"] = {"$in": q.styleTags}

    # user vector (optional)
    v = None
    if q.user_id:
        u = users.get(ids=[q.user_id], include=["embeddings"])    
        if len(u.get("embeddings", [])):
            v = np.array(u["embeddings"][0], dtype="float32")

    if v is None:
        res = products.get(where=where, include=["metadatas","ids"], limit=q.limit)
        items = [{"id": i, **m} for i,m in zip(res["ids"], res["metadatas"]) ]
        return {"items": items}

    res = products.query(query_embeddings=[v.tolist()], n_results=max(q.limit*3, 30), where=where, include=["metadatas","ids","distances"])
    triples = []
    for i,m,d in zip(res["ids"][0], res["metadatas"][0], res["distances"][0]):
        s = 1.0 - float(d)  # cosine sim approx
        triples.append((s,i,m))
    triples.sort(key=lambda x: x[0], reverse=True)
    out = [{"id": i, **m} for (s,i,m) in triples[:q.limit]]
    return {"items": out}
```

Run:

```
uvicorn apps.serve.main:app --reload --port 8000
```

### 4.3 Ingestion scripts (`packages/catalog/ingest.py`)

```python
import json, chromadb, numpy as np
from PIL import Image
from pathlib import Path
from main import emb_image, client  # reuse model/client if in same env

products = client.get_or_create_collection(name="products", metadata={"hnsw:space":"cosine"})
moodboards = client.get_or_create_collection(name="moodboards", metadata={"hnsw:space":"cosine"})

# Moodboards
mb = json.load(open("packages/catalog/moodboards.json"))
ids, embs, metas = [], [], []
for r in mb:
    img = Image.open(Path("public")/r["image_url"][1:]).convert("RGB")
    v = emb_image(img)
    ids.append(r["id"]); embs.append(v.tolist()); metas.append({k:r[k] for k in r if k not in ("id","image_url")})

moodboards.upsert(ids=ids, embeddings=embs, metadatas=metas)

# Products
prod = json.load(open("packages/catalog/products.json"))
ids, embs, metas = [], [], []
for r in prod:
    img = Image.open(Path("public")/r["image"][1:]).convert("RGB")
    v = emb_image(img)
    ids.append(r["id"]); embs.append(v.tolist())
    metas.append({k:r[k] for k in r if k not in ("id","image")})

products.upsert(ids=ids, embeddings=embs, metadatas=metas)
```

---

## 5) Frontend — Next.js key components

### 5.1 Onboarding picker (A/B)

* Load moodboards JSON.
* For each pair answered, call `POST /taste/update` with `{user_id, win_id, lose_id}`.
* After ~12 pairs, navigate to room intake.

### 5.2 Room intake

* **Option A**: upload RoomPlan USDZ (iOS helper app). Parse walls (you can also skip and use a simple box).
* **Option B**: inputs for width/length/height + door/window placements on a 2D plan overlay.

### 5.3 Auto‑furnish

* For each needed category (e.g., sofa, rug, table, lamp…):

  * Call `POST /catalog/search` with `{user_id, category, budget, minWidthIn, maxWidthIn}`
  * Take top item → send to `/placement/auto` (or run placement in FE) → add to scene.
* Provide a right‑panel with 4 alternates (call search again, skip current ID).

---

## 6) Placement (deterministic, minimal)

### 6.1 FE‑side layout utils (TS pseudocode)

```ts
export type AABB = {min:[number,number], max:[number,number]};
export function collide(a:AABB, b:AABB){
  return !(a.max[0] < b.min[0] || a.min[0] > b.max[0] || a.max[1] < b.min[1] || a.min[1] > b.max[1]);
}

export function placeAgainstWall(room, itemDims, walls){
  // sample points along the longest wall; test AABB with margin
}
```

### 6.2 Heuristic order

* **Living**: sofa → rug → coffee table → TV/console → lamp → accent chair/plant.
* **Bedroom**: bed → nightstands → rug → dresser.

---

## 7) SceneOps DSL (shared in `packages/scene-dsl/index.ts`)

```ts
export type SceneOp =
 | { add: { category:string; primary:string; alternates?:string[]; notes?:string } }
 | { replace: { category:string; with:{ primary:string } } }
 | { set: { budget?:number; palette?:string[]; style?:string[] } };

export interface SceneOps { ops: SceneOp[] }
```

---

## 8) LLM Planner (optional but powerful)

### 8.1 Tool schema (conceptual)

```json
{
  "name": "search_catalog",
  "description": "Return up to 12 furniture items filtered by category and constraints.",
  "parameters": {
    "type": "object",
    "properties": {
      "category": {"type":"string"},
      "roomType": {"type":"string"},
      "budget": {"type":"number"},
      "minWidthIn": {"type":"number"},
      "maxWidthIn": {"type":"number"},
      "styleTags": {"type":"array","items":{"type":"string"}},
      "limit": {"type":"integer","default":12}
    },
    "required": ["category"]
  }
}
```

### 8.2 Prompts

1. **Design Brief**: feed the list of liked IDs + room dims; request `{styleTags,palette,materials,categories,constraints}` JSON.
2. **Pick Items**: for each category, call `search_catalog`; output `SceneOps` JSON.
3. **AI Tweak**: translate user text → `SceneOps` (call tool as needed).

---

## 9) Color & Tag Derivation (optional niceties)

* For palette display: extract dominant colors from liked images (k‑means in Lab space). Use labels like `warm‑neutral`, `cool‑grey`, `earthy`, `bold`.
* For style tags: predefine CLIP text prompts (e.g., "a japandi living room") and take top‑k cosine with `v_user`.

---

## 10) Testing Checklist

* A/B picker updates `v_user` and shows live top‑3 style tags.
* Catalog ingestion populates Chroma; `/catalog/search` returns matches and respects width/budget filters.
* Auto‑furnish places sofa without door/window collisions.
* Alternates swap works and updates shopping list.
* AI Tweak: "add a floor lamp under $150" → adds lamp near sofa.

---

## 11) Demo Script (2 minutes)

1. Pick 6–8 A/B choices → live style tags & palette appear.
2. Enter room 14'×12' with one door + window.
3. Click **Auto Furnish** → sofa/rug/table/lamp appear.
4. Swap sofa → price updates; click a buy link.
5. Type: "cozier, add paper lantern under $120" → lamp appears, lighting icon toggles warm.
6. Screenshot scene + share link.

---

## 12) Performance Tips

* Pre‑embed everything once; persist Chroma to disk.
* Overfetch 30 and re‑rank client‑side for diversity.
* Keep product catalog ≤200 models for texture load sanity.

---

## 13) Next Steps / TODOs

* [ ] Fill `moodboards.json` and images under `apps/web/public/moodboards/`
* [ ] Fill `products.json`, add 3D models under `apps/web/public/models/`
* [ ] Run `ingest.py` to seed Chroma
* [ ] Wire A/B picker → `/taste/update`
* [ ] Implement `/placement/auto` or FE placement utils
* [ ] Add shopping list panel with subtotal
* [ ] Add "AI Tweak" text box that calls planner

---

### Appendix A — Minimal `/placement/auto` (Python, optional)

```python
from pydantic import BaseModel
from typing import List, Tuple

class Room(BaseModel):
    w: float; l: float; h: float
    doors: List[Tuple[float,float]] = []  # (x,z)
    windows: List[Tuple[float,float]] = []

class Item(BaseModel):
    id: str; category: str; w: float; d: float

@app.post("/placement/auto")
def placement_auto(room: Room, items: list[Item]):
    # trivial: put sofa against longest wall, center; others relative.
    # return positions and rotations.
    return {"placements": [...]}  
```

### Appendix B — Cosine helpers (TS)

```ts
export const l2 = (v: number[]) => {
  const s = Math.hypot(...v); return v.map(x => x/(s||1));
};
export const cos = (a:number[], b:number[]) => {
  let s=0; for (let i=0;i<a.length;i++) s += a[i]*b[i]; return s;
};
```

---

**You can now build this step‑by‑step in Cursor.** Start by seeding Chroma with moodboards + products, then wire the A/B picker → taste vector → catalog search → placement.
