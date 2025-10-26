from __future__ import annotations

from collections import Counter
import json
import logging
import os
from typing import Any, Dict, List, Optional

import chromadb
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from apps.serve.services.claude import ClaudeSettingsError, summarize_taste
from apps.serve.services.claude_3d_generator import Claude3DGenerator
from apps.serve.services.complete_room_generator import CompleteRoomGenerator
from apps.serve.services.furniture import (
    FurnitureSearchService,
    search_furniture_semantically,
)

logger = logging.getLogger(__name__)

load_dotenv()

CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

if not all([CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE]):
    raise RuntimeError(
        "Missing Chroma Cloud configuration: set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE"
    )

app = FastAPI(title="FurnishML API")

allowed_origins = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = chromadb.CloudClient(
    api_key=CHROMA_API_KEY,
    tenant=CHROMA_TENANT,
    database=CHROMA_DATABASE,
)

artworks = client.get_or_create_collection("artworks", metadata={"hnsw:space": "cosine"})
users = client.get_or_create_collection("users", metadata={"hnsw:space": "cosine"})


class Artwork(BaseModel):
    id: str
    title: str
    artist: str
    museum: str
    image_url: str
    style_tags: list[str] | None = None
    palette_keywords: list[str] | None = None
    material_inspirations: list[str] | None = None
    mood_keywords: list[str] | None = None


class TasteUpdate(BaseModel):
    user_id: str
    win_id: str
    lose_id: str | None = None


class TasteSummaryRequest(BaseModel):
    user_id: str
    top_k: int = 6
    vector_preview: int = 12


class FurnitureSearchRequest(BaseModel):
    """Request model for furniture semantic search."""

    user_id: Optional[str] = None
    text_query: Optional[str] = None
    category: Optional[str] = None
    limit: int = 10
    max_price: Optional[float] = None
    style_tags: Optional[list[str]] = None
    use_claude: bool = True


class Generate3DRequest(BaseModel):
    """Request model for procedural furniture generation."""

    furniture_type: str
    style: str
    colors: list[str]
    materials: list[str]
    dimensions: Optional[dict[str, float]] = None
    use_cached: bool = True


class ImageTo3DRequest(BaseModel):
    """Request model for image-assisted furniture generation."""

    image_url: str
    description: str
    enhance_with_ai: bool = True


class CompleteRoomRequest(BaseModel):
    """Request model for whole-room generation."""

    image_data: str
    description: Optional[str] = None
    existing_code: Optional[str] = None
    max_tokens: int = 8000


def _parse_metadata(meta: Dict[str, Any]) -> Dict[str, Any]:
    array_fields = {
        "style_tags",
        "palette_keywords",
        "material_inspirations",
        "mood_keywords",
    }
    parsed: Dict[str, Any] = {}
    for key, value in meta.items():
        if key in array_fields:
            if isinstance(value, list):
                parsed[key] = value
            elif isinstance(value, str):
                try:
                    loaded = json.loads(value)
                    parsed[key] = loaded if isinstance(loaded, list) else value
                except json.JSONDecodeError:
                    parsed[key] = value
            else:
                parsed[key] = value
        else:
            parsed[key] = value
    return parsed


def _ensure_sequence(value: Any) -> List[Any]:
    if value is None:
        return []
    if hasattr(value, "tolist"):
        try:
            return value.tolist()
        except TypeError:
            pass
    if isinstance(value, (list, tuple)):
        return list(value)
    return [value]


def _first_list(value: Any) -> List[Any]:
    seq = _ensure_sequence(value)
    if len(seq) == 1:
        first = seq[0]
        if isinstance(first, (list, tuple)):
            return list(first)
        if hasattr(first, "tolist"):
            try:
                return first.tolist()
            except TypeError:
                pass
    return seq


def _collect_keywords(items: List[Dict[str, Any]], key: str, *, limit: int = 6) -> List[str]:
    counter: Counter[str] = Counter()
    for entry in items:
        values = entry.get("metadata", {}).get(key)
        if isinstance(values, list):
            counter.update([v for v in values if isinstance(v, str)])
    return [kw for kw, _ in counter.most_common(limit)]


def _build_prompt(context: Dict[str, Any]) -> str:
    instructions = (
        "You are an interior design stylist translating a user's 512-D taste vector into language. "
        "Return a JSON object with keys: concise, poetic, planner_brief, palette_summary, "
        "style_summary, material_summary, mood_summary. Each value should be a short string. "
        "Do not include additional keys. Reference the artworks, tags, and palette clues from the context."
    )
    return f"{instructions}\n\nContext:\n{json.dumps(context, indent=2)}"


def _infer_furniture_attributes(description: str) -> tuple[str, List[str], List[str], str]:
    text = (description or "").lower()
    furniture_candidates = [
        "sofa",
        "couch",
        "chair",
        "table",
        "desk",
        "lamp",
        "bed",
        "dresser",
        "nightstand",
        "stool",
        "bench",
    ]
    furniture_type = next(
        (candidate for candidate in furniture_candidates if candidate in text),
        "furniture",
    )
    synonyms = {"couch": "sofa"}
    furniture_type = synonyms.get(furniture_type, furniture_type)

    color_candidates = [
        "black",
        "white",
        "gray",
        "grey",
        "beige",
        "brown",
        "cream",
        "gold",
        "silver",
        "green",
        "blue",
        "red",
        "natural wood",
        "wood",
    ]
    colors = [color for color in color_candidates if color in text]
    colors = list(dict.fromkeys(colors)) or ["neutral"]

    material_candidates = [
        "wood",
        "metal",
        "fabric",
        "leather",
        "glass",
        "stone",
        "marble",
        "rattan",
        "bamboo",
    ]
    materials = [material for material in material_candidates if material in text]
    materials = list(dict.fromkeys(materials)) or ["wood"]

    style_candidates = [
        "modern",
        "contemporary",
        "minimalist",
        "scandinavian",
        "mid-century",
        "industrial",
        "traditional",
        "bohemian",
        "coastal",
        "art deco",
        "japanese",
        "rustic",
    ]
    style = next((candidate for candidate in style_candidates if candidate in text), "modern")

    return furniture_type, colors, materials, style


def _generate_furniture_response(
    generator: Claude3DGenerator,
    *,
    furniture_type: str,
    style: str,
    colors: List[str],
    materials: List[str],
    dimensions: Optional[Dict[str, float]],
    use_cached: bool,
    metadata_extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    base_metadata: Dict[str, Any] = {
        "furniture_type": furniture_type,
        "style": style,
        "colors": colors,
        "materials": materials,
        "dimensions": dimensions,
    }
    if metadata_extra:
        base_metadata.update(metadata_extra)

    try:
        code = generator.generate_furniture_code(
            furniture_type=furniture_type,
            style=style,
            colors=colors,
            materials=materials,
            dimensions=dimensions,
        )
        source = "fallback" if code.startswith("// FALLBACK_CODE") else "claude"
        return {
            "code": code,
            "source": source,
            "metadata": base_metadata,
        }
    except ValueError as exc:
        if use_cached:
            fallback_code = generator._get_fallback_code(furniture_type)
            metadata = {**base_metadata, "error": "API key not configured, using fallback"}
            return {
                "code": fallback_code,
                "source": "fallback",
                "metadata": metadata,
            }
        raise HTTPException(
            status_code=503,
            detail="Claude API key not configured. Set ANTHROPIC_API_KEY environment variable.",
        ) from exc
    except Exception as exc:
        if use_cached:
            try:
                fallback_code = generator._get_fallback_code(furniture_type)
            except Exception:
                fallback_code = None
            if fallback_code:
                metadata = {**base_metadata, "error": str(exc)}
                return {
                    "code": fallback_code,
                    "source": "fallback",
                    "metadata": metadata,
                }
        raise HTTPException(
            status_code=500,
            detail=f"Error generating 3D model: {exc}",
        ) from exc


@app.get("/artworks/list")
def list_artworks() -> Dict[str, Any]:
    try:
        res = artworks.get(include=["metadatas"], limit=300)
        ids = res.get("ids", [])
        metas = res.get("metadatas", [])
    except ValueError:
        peek = artworks.peek(limit=300)
        ids = peek.get("ids", [])
        metas = peek.get("metadatas", [])

    ids = _first_list(ids)
    metas = [
        _parse_metadata(meta) if isinstance(meta, dict) else meta
        for meta in _first_list(metas)
    ]

    items = []
    for idx, meta in zip(ids, metas):
        if meta is None:
            continue
        item = {"id": idx}
        if isinstance(meta, dict):
            item.update(meta)
        items.append(item)
    return {"items": items}


@app.post("/taste/update")
def taste_update(payload: TasteUpdate) -> Dict[str, Any]:
    try:
        current = users.get(ids=[payload.user_id], include=["embeddings"])
    except chromadb.errors.InvalidCollectionException:
        current = {"ids": [], "embeddings": []}

    embeddings_raw = current.get("embeddings") or []
    embeddings = [np.array(e, dtype="float32") for e in embeddings_raw]
    user_vec: np.ndarray | None = embeddings[0] if embeddings else None

    mood_res = artworks.get(
        ids=[payload.win_id] + ([payload.lose_id] if payload.lose_id else []),
        include=["embeddings"],
    )
    mood_embeddings_raw = mood_res.get("embeddings") or []
    mood_embeddings = [np.array(e, dtype="float32") for e in mood_embeddings_raw]
    if not mood_embeddings:
        raise HTTPException(status_code=404, detail="Artwork embeddings not found")

    win_vec = np.copy(mood_embeddings[0])
    lose_vec = None
    if payload.lose_id and len(mood_embeddings) > 1:
        lose_vec = np.copy(mood_embeddings[1])

    if user_vec is None:
        user_vec = win_vec
    else:
        user_vec = user_vec + win_vec
    if lose_vec is not None:
        user_vec = user_vec - 0.5 * lose_vec

    norm = np.linalg.norm(user_vec)
    if norm > 0:
        user_vec = user_vec / norm

    users.upsert(
        ids=[payload.user_id],
        embeddings=[user_vec.tolist()],
        metadatas=[{"updated_at": __import__("time").time()}],
    )
    return {"ok": True, "vector": user_vec.tolist()}


@app.post("/taste/summarize")
def taste_summarize(payload: TasteSummaryRequest) -> Dict[str, Any]:
    top_k = max(1, min(payload.top_k, 24))
    try:
        user_res = users.get(ids=[payload.user_id], include=["embeddings", "metadatas"])
    except chromadb.errors.InvalidCollectionException as exc:
        raise HTTPException(status_code=404, detail="User collection not initialized") from exc

    embeddings_raw = _ensure_sequence(user_res.get("embeddings"))
    if len(embeddings_raw) == 0:
        raise HTTPException(status_code=404, detail="User taste vector not found")

    user_vec = np.array(embeddings_raw[0], dtype="float32")
    vector_preview = user_vec[: max(0, payload.vector_preview)].tolist()

    query = artworks.query(
        query_embeddings=[user_vec.tolist()],
        n_results=max(top_k, 6),
        include=["metadatas", "distances"],
    )

    ids_list = _first_list(query.get("ids"))
    metas_list = _first_list(query.get("metadatas"))
    distances = _first_list(query.get("distances"))

    top_items: List[Dict[str, Any]] = []
    for idx, meta, dist in zip(ids_list, metas_list, distances):
        if not meta:
            continue
        parsed_meta = _parse_metadata(meta) if isinstance(meta, dict) else {}
        top_items.append(
            {
                "id": idx,
                "similarity": float(1 - dist) if dist is not None else None,
                "metadata": {
                    k: parsed_meta.get(k)
                    for k in [
                        "title",
                        "artist",
                        "museum",
                        "image_url",
                        "style_tags",
                        "palette_keywords",
                        "material_inspirations",
                        "mood_keywords",
                    ]
                },
            }
        )
        if len(top_items) >= top_k:
            break

    if not top_items:
        raise HTTPException(status_code=404, detail="No artwork matches found")

    aggregates = {
        "style_keywords": _collect_keywords(top_items, "style_tags"),
        "palette_keywords": _collect_keywords(top_items, "palette_keywords"),
        "material_keywords": _collect_keywords(top_items, "material_inspirations"),
        "mood_keywords": _collect_keywords(top_items, "mood_keywords"),
    }

    context = {
        "user_id": payload.user_id,
        "vector_preview": vector_preview,
        "top_artworks": top_items,
        "aggregates": aggregates,
    }

    prompt = _build_prompt(context)

    try:
        claude_response = summarize_taste(prompt, model=ANTHROPIC_MODEL)
    except ClaudeSettingsError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Claude summarization failed for user %s", payload.user_id)
        raise HTTPException(status_code=502, detail="Claude summarization failed") from exc

    summary = claude_response.get("parsed") or {}
    raw_summary = claude_response.get("raw_text")

    return {
        "user_id": payload.user_id,
        "model": ANTHROPIC_MODEL,
        "vector_preview": vector_preview,
        "top_artworks": top_items,
        "aggregates": aggregates,
        "summary": summary,
        "raw_summary": raw_summary,
        "claude_metadata": {
            "response_id": claude_response.get("id"),
            "usage": claude_response.get("usage"),
        },
    }


@app.post("/api/furniture/search")
def search_furniture(payload: FurnitureSearchRequest) -> Dict[str, Any]:
    try:
        filters: Dict[str, Any] = {}
        if payload.max_price is not None:
            filters["max_price"] = payload.max_price
        if payload.style_tags:
            filters["style_tags"] = payload.style_tags

        results = search_furniture_semantically(
            chroma_client=client,
            user_id=payload.user_id,
            text_query=payload.text_query,
            category=payload.category,
            limit=payload.limit,
            use_claude=payload.use_claude,
            **filters,
        )

        return {
            "items": results,
            "count": len(results),
            "query": {
                "user_id": payload.user_id,
                "text_query": payload.text_query,
                "category": payload.category,
            },
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching furniture: {exc}",
        ) from exc


@app.get("/api/furniture/{furniture_id}")
def get_furniture_by_id(furniture_id: str) -> Dict[str, Any]:
    try:
        service = FurnitureSearchService(client)
        item = service.get_furniture_by_id(furniture_id)
        if not item:
            raise HTTPException(status_code=404, detail="Furniture item not found")
        return item
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving furniture: {exc}",
        ) from exc


@app.post("/api/generate-3d")
def generate_3d_model(payload: Generate3DRequest) -> Dict[str, Any]:
    generator = Claude3DGenerator()
    return _generate_furniture_response(
        generator,
        furniture_type=payload.furniture_type,
        style=payload.style,
        colors=payload.colors,
        materials=payload.materials,
        dimensions=payload.dimensions,
        use_cached=payload.use_cached,
    )


@app.post("/api/image-to-3d")
def generate_3d_from_image(payload: ImageTo3DRequest) -> Dict[str, Any]:
    generator = Claude3DGenerator()
    furniture_type, colors, materials, style = _infer_furniture_attributes(payload.description)
    metadata_extra = {
        "description": payload.description,
        "detected_colors": colors,
        "detected_materials": materials,
        "detected_style": style,
        "image_url": payload.image_url,
        "enhance_with_ai": payload.enhance_with_ai,
    }
    return _generate_furniture_response(
        generator,
        furniture_type=furniture_type,
        style=style,
        colors=colors,
        materials=materials,
        dimensions=None,
        use_cached=True,
        metadata_extra=metadata_extra,
    )


@app.post("/api/generate-complete-room")
def generate_complete_room(payload: CompleteRoomRequest) -> Dict[str, Any]:
    try:
        generator = CompleteRoomGenerator()
        result = generator.generate_complete_room_from_image(
            image_data=payload.image_data,
            room_description=payload.description,
            existing_code=payload.existing_code,
            max_tokens=payload.max_tokens,
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Claude API configuration error: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating complete room: {exc}",
        ) from exc
