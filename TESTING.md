# Testing Guide - Furniture Search System

## Quick Start Testing

### 1. Setup & Run

```bash
# Backend
cd taste-fingerprint/apps/serve
source venv/bin/activate
python scripts/embed_furniture.py  # Populate ChromaDB
uvicorn main:app --reload --port 8000

# Frontend (in another terminal)
cd artspace-interior/artspace-ui
npm run dev
```

### 2. Test Backend API

#### Health Check
```bash
curl http://localhost:8000/health
```

Expected: `{"status":"healthy","service":"nerf-api","version":"1.0.0"}`

#### Simple Furniture Search (No Claude)
```bash
curl -X POST http://localhost:8000/api/furniture/search \
  -H "Content-Type: application/json" \
  -d '{
    "text_query": "modern sofa",
    "limit": 5,
    "use_claude": false
  }'
```

#### Claude-Enhanced Search
```bash
curl -X POST http://localhost:8000/api/furniture/search \
  -H "Content-Type: application/json" \
  -d '{
    "text_query": "I need a cozy modern wooden coffee table for my living room",
    "limit": 5,
    "use_claude": true
  }'
```

#### Search with User Preferences
```bash
# First, create a user preference (simulate style quiz completion)
curl -X POST http://localhost:8000/taste/update \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "win_id": "art_botticelli_john",
    "lose_id": "art_caravaggio_denial"
  }'

# Then search with that user's preferences
curl -X POST http://localhost:8000/api/furniture/search \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "text_query": "coffee table",
    "limit": 5
  }'
```

## Test Cases

### Test Case 1: Simple Category Search
**Query:** "sofa"
**Expected:** Returns all sofa items, ranked by generic relevance

### Test Case 2: Style-Specific Search
**Query:** "modern minimalist sofa"
**Expected:** 
- Claude extracts: style_tags=["modern", "minimalist"]
- Returns sofas with modern/minimalist styles ranked higher

### Test Case 3: Material-Specific Search
**Query:** "wooden dining table"
**Expected:**
- Claude extracts: materials=["wood"], subcategory="table"
- Returns wooden tables

### Test Case 4: Natural Language Query
**Query:** "I need something to light up my reading corner, preferably warm and not too tall"
**Expected:**
- Claude extracts: category="lighting", subcategory="floor lamp" or "table lamp"
- Filters by height
- Returns appropriate lighting fixtures

### Test Case 5: Complex Multi-Criteria
**Query:** "looking for a mid-century modern oak coffee table, around 4 feet wide"
**Expected:**
- Claude extracts: 
  - style_tags=["mid-century", "modern"]
  - materials=["oak", "wood"]
  - subcategory="table"
  - dimensions_hint={"approximate_width": 48}
- Returns matching tables

### Test Case 6: Hybrid Search (User + Query)
**Setup:** User completes style quiz, shows preference for bohemian/natural styles
**Query:** "table"
**Expected:**
- Combines user preference vector (60%) with "table" query (40%)
- Returns tables that match user's bohemian taste

## Validation Checklist

### Backend
- [ ] ChromaDB collection "furniture" populated (22 items)
- [ ] ChromaDB collection "users" accessible
- [ ] Health endpoint returns 200
- [ ] Search without user_id works
- [ ] Search with user_id works
- [ ] Claude enhancement working (check logs for "Claude enhanced query")
- [ ] Results include similarity_score field
- [ ] Style tags filter working
- [ ] Category filter working

### Claude Integration
- [ ] ANTHROPIC_API_KEY set in .env
- [ ] Claude extracts category correctly
- [ ] Claude extracts style_tags correctly
- [ ] Claude extracts materials correctly
- [ ] Fallback works when Claude fails (uses original query)
- [ ] use_claude=false disables Claude (faster)

### Response Format
```json
{
  "items": [
    {
      "id": "furn_sofa_modern_001",
      "name": "Modern L-Shape Sofa",
      "category": "furniture",
      "subcategory": "sofa",
      "styleTags": ["modern", "minimalist", "contemporary"],
      "colors": ["gray", "charcoal"],
      "dimensions": {
        "width": 96,
        "depth": 60,
        "height": 32,
        "unit": "inches"
      },
      "description": "Contemporary L-shaped sectional sofa...",
      "image_url": "/furniture/sofa_modern_001.jpg",
      "model_url": "/models/furniture/sofa_modern_001.glb",
      "model_format": "gltf",
      "similarity_score": 0.8234
    }
  ],
  "count": 1,
  "query": {
    "user_id": "test_user_123",
    "text_query": "modern sofa",
    "category": null
  }
}
```

## Common Issues & Solutions

### Issue: "chromadb.errors.InvalidCollectionException"
**Solution:** Run `python scripts/embed_furniture.py` to populate the database

### Issue: "ANTHROPIC_API_KEY not set" warning
**Solution:** Add the API key to `.env` file. Search will still work without it.

### Issue: No results returned
**Causes:**
1. ChromaDB not populated → Run embed script
2. Query too specific → Try broader terms
3. No user preferences → Test without user_id first

### Issue: Similarity scores all very low (<0.5)
**Causes:**
1. Query mismatch with catalog
2. User preferences very different from catalog items
**Solution:** Check if catalog contains relevant items

### Issue: Claude not enhancing queries
**Check:**
1. ANTHROPIC_API_KEY is correct
2. Check backend logs for errors
3. Try with use_claude=false to confirm CLIP search works

## Performance Benchmarks

- Simple search (no Claude): ~200-500ms
- Claude-enhanced search: ~1-2 seconds (first call)
- Cached search: ~100-200ms
- With user preferences: +50-100ms

## Example Claude Enhancements

| Original Query | Claude Enhanced | Extracted Info |
|---|---|---|
| "cozy sofa" | "bohemian comfortable sectional sofa" | style_tags: ["bohemian"], materials: ["fabric"] |
| "reading lamp" | "adjustable floor lamp reading light" | category: "lighting", subcategory: "floor lamp" |
| "wooden table" | "natural wood dining table" | materials: ["wood"], subcategory: "table" |
| "modern art" | "abstract contemporary canvas painting" | category: "painting", style_tags: ["modern", "abstract"] |

## Next Steps After Testing

1. ✅ Verify all 22 furniture items searchable
2. ✅ Test user preference + query hybrid
3. ✅ Validate Claude enhancement quality
4. 🔲 Integrate with frontend 3D viewer
5. 🔲 Add furniture images to `/public/furniture/`
6. 🔲 Add 3D models to `/public/models/`
7. 🔲 Test end-to-end flow in browser

## Debug Mode

Enable verbose logging:

```python
# In main.py, add at top
import logging
logging.basicConfig(level=logging.DEBUG)
```

This will show:
- ChromaDB queries
- CLIP embedding generation
- Claude API calls
- Search results ranking
