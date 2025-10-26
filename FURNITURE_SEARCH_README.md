# 3D Furniture Semantic Search Integration

This document explains the furniture search system that combines user taste preferences with natural language queries to find and render 3D furniture models.

## Architecture Overview

```
User → Style Quiz → User Preference Embeddings (ChromaDB)
                          ↓
Natural Language Query → CLIP Text Embedding
                          ↓
        Hybrid Semantic Search (60% user prefs + 40% query)
                          ↓
        ChromaDB Cache ← → External 3D Datasets
                          ↓
                3D Model URLs (GLTF/OBJ)
                          ↓
                Three.js 3D Viewer
```

## Components

### Backend (taste-fingerprint/apps/serve/)

1. **`services/furniture.py`** - Core furniture search service
   - `FurnitureSearchService`: Manages ChromaDB caching and hybrid search
   - `hybrid_search()`: Combines user embeddings + text queries
   - `_fetch_from_external_sources()`: Fetches from 3D model APIs (to be implemented)
   - `_cache_furniture_items()`: Caches results in ChromaDB

2. **`main.py`** - API endpoints
   - `POST /api/furniture/search`: Main search endpoint
   - `GET /api/furniture/{id}`: Get specific furniture item

### Frontend (artspace-ui/)

1. **`lib/furniture-api.ts`** - TypeScript API client
   - `searchFurniture()`: Call search API
   - `hybridFurnitureSearch()`: Convenience function
   - `searchFurnitureByCategory()`: Category-based search

2. **`app/components/3DViewer.tsx`** - Enhanced 3D viewer
   - Loads GLTF/OBJ models using Three.js loaders
   - Positions furniture in the scene
   - Shows loading states

3. **`app/page.tsx`** - Main application flow
   - Generates unique user ID
   - Calls furniture search after style selection
   - Passes furniture to 3D viewer

## Setup Instructions

### 1. Backend Setup

```bash
cd taste-fingerprint/apps/serve

# Install dependencies
pip install -r requirements.txt

# Environment is already configured in .env
# Verify these values:
# CHROMA_API_KEY=ck-5yuJR9tQsoMELDLbQdnUyGKgzkbWXkm2sGUpLwnbtdxE
# CHROMA_TENANT=b7a5f264-9400-420e-96f1-b3dd6638f24b
# CHROMA_DATABASE=taste-fingerprint

# Run the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd artspace-interior/artspace-ui

# Install dependencies (if not already done)
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local and set:
# NEXT_PUBLIC_FURNITURE_API_URL=http://localhost:8000

# Run the development server
npm run dev
```

## How It Works

### 1. User Preference Collection
- User completes style quiz
- Each choice updates their taste vector in ChromaDB
- Vector is stored under unique user ID

### 2. Furniture Search
When user completes the style quiz:
```typescript
// Automatically searches for furniture
const items = await searchFurnitureByCategory('sofa', userId, 3)
```

### 3. Hybrid Search Algorithm
```python
# Backend combines embeddings
user_embedding = get_user_vector(user_id)  # 60% weight
text_embedding = embed_text(query)          # 40% weight
combined = 0.6 * user_embedding + 0.4 * text_embedding

# Search ChromaDB
results = furniture_collection.query(
    query_embeddings=[combined],
    n_results=limit
)
```

### 4. 3D Model Loading
```typescript
// Frontend loads and renders models
const gltfLoader = new GLTFLoader()
gltfLoader.load(item.model_url, (gltf) => {
  scene.add(gltf.scene)
})
```

## API Reference

### POST /api/furniture/search

Search for furniture using hybrid semantic search.

**Request:**
```json
{
  "user_id": "user_123",
  "text_query": "modern wooden coffee table",
  "category": "table",
  "limit": 10,
  "max_price": 500,
  "style_tags": ["modern", "minimalist"]
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "furniture_001",
      "name": "Modern Coffee Table",
      "category": "table",
      "model_url": "https://example.com/models/table.glb",
      "thumbnail_url": "https://example.com/thumbs/table.jpg",
      "dimensions": {
        "width": 120,
        "depth": 60,
        "height": 45
      },
      "style_tags": ["modern", "minimalist"],
      "price": 299,
      "similarity": 0.92
    }
  ],
  "count": 1,
  "query": {
    "user_id": "user_123",
    "text_query": "modern wooden coffee table",
    "category": "table"
  }
}
```

## Next Steps: Integrate Real 3D Datasets

Currently using mock data. To integrate real 3D model sources, implement in `services/furniture.py`:

### Option 1: Objaverse (Recommended)
```python
# Install: pip install objaverse
import objaverse

def _fetch_from_objaverse(query: str, limit: int):
    # Search Objaverse dataset
    uids = objaverse.load_uids()
    # Filter by query
    # Download models
    objects = objaverse.load_objects(uids[:limit])
    return normalized_results
```

### Option 2: Sketchfab API
```python
import requests

def _fetch_from_sketchfab(query: str, limit: int):
    response = requests.get(
        "https://api.sketchfab.com/v3/search",
        params={
            "type": "models",
            "q": query,
            "downloadable": True
        },
        headers={"Authorization": f"Token {SKETCHFAB_API_KEY}"}
    )
    return normalized_results
```

### Option 3: PolyHaven
```python
def _fetch_from_polyhaven(category: str):
    # PolyHaven has free CC0 3D assets
    response = requests.get(f"https://api.polyhaven.com/assets?t={category}")
    return normalized_results
```

## Testing the Integration

1. **Start both servers:**
```bash
# Terminal 1: Backend
cd taste-fingerprint/apps/serve
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd artspace-interior/artspace-ui
npm run dev
```

2. **Test the flow:**
   - Go to http://localhost:3000
   - Upload a floorplan
   - Complete the style quiz
   - View the 3D scene with furniture loaded

3. **Test API directly:**
```bash
curl -X POST http://localhost:8000/api/furniture/search \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "text_query": "modern sofa",
    "category": "sofa",
    "limit": 5
  }'
```

## Troubleshooting

### CORS Issues
If you see CORS errors, ensure:
1. Backend .env has correct CORS_ALLOW_ORIGINS
2. Frontend is using correct NEXT_PUBLIC_FURNITURE_API_URL

### ChromaDB Connection Issues
Verify credentials in `taste-fingerprint/apps/serve/.env`:
- CHROMA_API_KEY
- CHROMA_TENANT
- CHROMA_DATABASE

### 3D Model Loading Issues
- Check browser console for loading errors
- Ensure model URLs are accessible
- Verify CORS headers on model hosting

## Performance Optimization

1. **Caching Strategy:**
   - First search: Query external APIs → Cache in ChromaDB
   - Subsequent searches: Use ChromaDB cache (much faster)

2. **Batch Loading:**
   - Load multiple furniture items in parallel
   - Show loading indicators per item

3. **Model Optimization:**
   - Use compressed GLTF (.glb) over OBJ when possible
   - Implement LOD (Level of Detail) for complex models
   - Consider using Draco compression

## Future Enhancements

- [ ] Integrate Objaverse dataset
- [ ] Add furniture placement algorithm (avoid collisions)
- [ ] Implement drag-and-drop for furniture repositioning
- [ ] Add furniture filtering UI (price, style, dimensions)
- [ ] Support for custom 3D model uploads
- [ ] Export scene as image/video
- [ ] Shopping cart and purchase links
