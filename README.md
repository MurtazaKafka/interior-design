# Interior Design 3D Furniture Search

AI-powered interior design assistant that uses semantic search to find and place 3D furniture models based on user preferences and natural language queries.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16 + React 19 + Three.js (3D rendering)
- **Backend**: FastAPI + Python 3.10+
- **ML/AI**: 
  - CLIP (OpenAI) for image/text embeddings
  - Claude 3.5 Sonnet (Anthropic) for natural language query enhancement
- **Vector DB**: ChromaDB Cloud for semantic search
- **3D Models**: GLTF/OBJ formats

### How It Works

1. **User Preference Collection**: Users complete a style quiz (A/B testing with artwork images)
2. **Taste Embedding**: CLIP generates a 512-dimensional taste vector stored in ChromaDB
3. **Natural Language Queries**: Users describe furniture they want ("I need a cozy modern wooden coffee table")
4. **Query Enhancement (Claude)**: AI parses the query to extract:
   - Category (furniture/lighting/painting)
   - Subcategory (sofa/table/lamp)
   - Style tags (modern, scandinavian, etc.)
   - Materials (wood, metal, glass)
   - Colors and dimensions
5. **Hybrid Search**: Combines user preference vector (60%) + enhanced text query embedding (40%)
6. **3D Rendering**: Loads and places selected furniture models in the 3D room scene

## 📁 Project Structure

```
.
├── artspace-interior/artspace-ui/          # Frontend (Next.js)
│   ├── app/
│   │   ├── components/
│   │   │   ├── 3DViewer.tsx               # Three.js 3D scene
│   │   │   ├── FloorplanUploader.tsx       # Upload room floorplan
│   │   │   ├── StyleQuiz.tsx               # User taste preferences
│   │   │   └── StudioChatPanel.tsx         # Chat interface for queries
│   │   └── page.tsx                        # Main app flow
│   └── lib/
│       ├── furniture-api.ts                # API client for furniture search
│       └── nerf-api.ts                     # NeRF 3D reconstruction
│
└── taste-fingerprint/                      # Backend (Python)
    ├── apps/serve/
    │   ├── main.py                         # FastAPI server
    │   ├── services/
    │   │   ├── embeddings.py               # CLIP embedding utilities
    │   │   └── furniture.py                # Furniture search service
    │   └── scripts/
    │       └── embed_furniture.py          # Populate ChromaDB with furniture
    │
    └── packages/catalog/
        ├── furniture.json                  # Curated furniture catalog (22 items)
        └── artworks.json                   # Artwork catalog for taste quiz

```

## 🚀 Setup Instructions

### 1. Clone and Navigate

```bash
cd /path/to/interior-design
```

### 2. Backend Setup (taste-fingerprint)

```bash
cd taste-fingerprint/apps/serve

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your own credentials
cat > .env << 'EOF'
CHROMA_API_KEY=<your_chroma_api_key>
CHROMA_TENANT=<your_chroma_tenant_id>
CHROMA_DATABASE=taste-fingerprint
ANTHROPIC_API_KEY=<your_anthropic_api_key>
SKETCHFAB_TOKEN=<your_sketchfab_token>
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:3001
EOF

# Embed furniture catalog into ChromaDB
python scripts/embed_furniture.py

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup (artspace-ui)

```bash
cd ../../artspace-interior/artspace-ui

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_FURNITURE_API_URL=http://localhost:8000
NEXT_PUBLIC_NERF_API_URL=http://localhost:5000
EOF

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

## 🎯 Usage Flow

### 1. Upload Floorplan
- User uploads a room floorplan image
- System processes it to create 3D room geometry

### 2. Style Preferences
- User completes a style quiz (9 questions)
- System generates taste vector using CLIP embeddings
- Vector stored in ChromaDB under user_id

### 3. Search Furniture
- User enters natural language query: "modern wooden coffee table"
- System searches furniture catalog using hybrid approach:
  - User taste vector (60 weight)
  - Text query embedding (40% weight)
- Returns ranked results with similarity scores

### 4. 3D Visualization
- Selected furniture loaded into Three.js scene
- User can view, rotate, and explore the furnished room

## 🔌 API Endpoints

### Furniture Search

**POST** `/api/furniture/search`

```json
{
  "user_id": "user_123",
  "text_query": "I need a cozy modern wooden coffee table for my living room",
  "category": "furniture",
  "limit": 10,
  "use_claude": true
}
```

**Claude Enhancement Example:**
Input: "I need a cozy modern wooden coffee table"
Claude extracts:
```json
{
  "enhanced_text": "modern scandinavian oak coffee table",
  "category": "furniture",
  "subcategory": "table",
  "style_tags": ["modern", "scandinavian", "cozy"],
  "materials": ["wood", "oak"],
  "colors": ["natural"]
}
```

Response:
```json
{
  "items": [
    {
      "id": "furn_table_coffee_002",
      "name": "Round Wooden Coffee Table",
      "category": "furniture",
      "subcategory": "table",
      "styleTags": ["scandinavian", "natural", "organic"],
      "colors": ["oak", "natural", "wood"],
      "dimensions": { "width": 36, "depth": 36, "height": 16, "unit": "inches" },
      "description": "Round coffee table with solid oak top and splayed legs",
      "image_url": "/furniture/table_coffee_002.jpg",
      "model_url": "/models/furniture/table_coffee_002.glb",
      "model_format": "gltf",
      "similarity_score": 0.8234
    }
  ],
  "count": 1,
  "query": {
    "user_id": "user_123",
    "text_query": "modern wooden coffee table",
    "category": "furniture"
  }
}
```

### Get Furniture by ID

**GET** `/api/furniture/{furniture_id}`

### User Taste Update

**POST** `/taste/update`

```json
{
  "user_id": "user_123",
  "win_id": "art_botticelli_john",
  "lose_id": "art_caravaggio_denial"
}
```

## 📊 Furniture Catalog

The catalog contains 22 curated 3D furniture items:

- **Furniture** (14 items): Sofas, chairs, tables, bookshelves, rugs, plants, cushions
- **Lighting** (5 items): Floor lamps, table lamps, pendants, chandeliers  
- **Paintings** (4 items): Abstract, botanical, landscape artwork

Each item includes:
- Name, description, dimensions
- Style tags (modern, mid-century, scandinavian, etc.)
- Color palette
- Image URL (for embedding)
- 3D model URL (GLTF format)

### Adding More Items

1. Add new entries to `packages/catalog/furniture.json`
2. Add corresponding images to `apps/web/public/furniture/`
3. Add 3D models to `apps/web/public/models/`
4. Re-run the embedding script:

```bash
cd taste-fingerprint/apps/serve
python scripts/embed_furniture.py
```

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:8000/health

# Search furniture
curl -X POST http://localhost:8000/api/furniture/search \
  -H "Content-Type: application/json" \
  -d '{
    "text_query": "modern sofa",
    "category": "furniture",
    "limit": 5
  }'
```

### Test Frontend

1. Navigate to `http://localhost:3000`
2. Upload a floorplan image
3. Complete the style quiz
4. View the 3D room with furniture

## 🔧 Troubleshooting

### ChromaDB Connection Issues
- Verify API key, tenant, and database name in `.env`
- Check network connectivity to ChromaDB Cloud

### Embedding Script Fails
- Ensure furniture images exist in `apps/web/public/furniture/`
- Check image paths in `furniture.json` match actual files
- Verify CLIP model downloads successfully

### 3D Models Not Loading
- Check model URLs in `furniture.json` are correct
- Verify GLTF files are valid (test with online viewer)
- Check browser console for Three.js errors

### CORS Errors
- Verify `CORS_ALLOW_ORIGINS` in backend `.env` includes frontend URL
- Check `NEXT_PUBLIC_API_BASE` in frontend `.env.local`

## 📝 Next Steps

### Short Term
- [ ] Add actual 3D model files (.glb) to `/public/models/`
- [ ] Add furniture product images to `/public/furniture/`
- [ ] Test end-to-end flow with real models
- [ ] Implement furniture placement logic in 3DViewer

### Medium Term
- [ ] Expand furniture catalog to 50-100 items
- [ ] Add price filtering and shopping cart
- [ ] Implement "Save Design" functionality
- [ ] Add furniture swapping/alternatives UI

### Long Term
- [ ] Integrate with real 3D furniture retailers (Wayfair, IKEA APIs)
- [ ] Auto-generate room layouts based on floorplan
- [ ] AR preview mode (mobile)
- [ ] Multi-room support

## 📚 Key Technologies

- **[CLIP](https://github.com/openai/CLIP)**: Connects text and images in same embedding space
- **[Claude 3.5 Sonnet](https://www.anthropic.com/claude)**: Advanced AI for natural language understanding
- **[ChromaDB](https://www.trychroma.com/)**: Open-source vector database
- **[Three.js](https://threejs.org/)**: JavaScript 3D library
- **[FastAPI](https://fastapi.tiangolo.com/)**: Modern Python web framework
- **[Next.js](https://nextjs.org/)**: React framework with SSR

## 🎯 Key Features

### 1. **Claude-Enhanced Query Understanding**
Instead of simple keyword matching, Claude AI parses natural language:
- "I want something cozy" → extracts style: bohemian, warm colors
- "modern wooden table" → furniture + table + modern + wood materials
- "floor lamp under 6 feet" → lighting + floor lamp + dimension constraints

### 2. **Hybrid Semantic Search**
- Combines user taste preferences (from style quiz)
- With specific item requests (from chat queries)
- Weights: 60% user taste + 40% text query

### 3. **Smart Caching**
- All searches cached in ChromaDB
- Instant results for repeated queries
- No repeated API calls

## 👥 Team

Built for CalHacks 12.0 by the Interior Design Team

## 📄 License

MIT
