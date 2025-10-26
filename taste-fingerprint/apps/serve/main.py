from __future__ import annotations

from collections import Counter
import logging
import json
import os
from typing import Any, Dict, List

import chromadb
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from apps.serve.services.claude import ClaudeSettingsError, summarize_taste, recommend_products


logger = logging.getLogger(__name__)

load_dotenv()

CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

if not all([CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE]):
    raise RuntimeError("Missing Chroma Cloud configuration: set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE")

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
products = client.get_or_create_collection("products", metadata={"hnsw:space": "cosine"})


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


class ProductRecommendationRequest(BaseModel):
    user_id: str
    limit: int = 12
    candidate_pool: int = 32


class ProductRecommendation(BaseModel):
    id: str
    score: float
    cosine_similarity: float
    claude_score: float | None
    metadata: dict[str, Any]


class ProductRecommendationResponse(BaseModel):
    user_id: str
    items: list[ProductRecommendation]


def _parse_metadata(meta: Dict[str, Any]) -> Dict[str, Any]:
    array_fields = {
        "style_tags",
        "palette_keywords",
        "material_inspirations",
        "mood_keywords",
        "materials",
        "colors",
        "roomTypes",
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
            if key == "price" and isinstance(value, str):
                try:
                    parsed[key] = float(value)
                    continue
                except ValueError:
                    pass
            parsed[key] = value
    return parsed


def _ensure_sequence(value: Any) -> list[Any]:
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


def _first_list(value: Any) -> list[Any]:
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


def _merge_scores(candidates: list[dict[str, Any]], claude_scores: dict[str, dict[str, Any]], *, alpha: float = 0.7) -> list[ProductRecommendation]:
    merged: list[ProductRecommendation] = []
    for item in candidates:
        item_id = item["id"]
        cosine = item.get("cosine_similarity", 0.0)
        meta = item.get("metadata", {})
        claude_entry = claude_scores.get(item_id)
        claude_score = claude_entry.get("score") if claude_entry else None
        if claude_score is not None:
            try:
                claude_score = float(claude_score)
            except (TypeError, ValueError):
                claude_score = None
        if claude_score is None:
            final_score = cosine
        else:
            final_score = alpha * cosine + (1 - alpha) * claude_score
        merged.append(
            ProductRecommendation(
                id=item_id,
                score=float(final_score),
                cosine_similarity=float(cosine),
                claude_score=claude_score,
                metadata=meta,
            )
        )
    merged.sort(key=lambda r: r.score, reverse=True)
    return merged


@app.get("/artworks/list")
def list_artworks() -> dict[str, Any]:
    try:
        res = artworks.get(include=["metadatas"], limit=300)
        ids = res.get("ids", [])
        metas = res.get("metadatas", [])
    except ValueError:
        peek = artworks.peek(limit=300)
        ids = peek.get("ids", [])
        metas = peek.get("metadatas", [])

    ids = _first_list(ids)
    metas = [_parse_metadata(meta) if isinstance(meta, dict) else meta for meta in _first_list(metas)]

    items = []
    for idx, meta in zip(ids, metas):
        if meta is None:
            continue
        item = {"id": idx}
        item.update(meta if isinstance(meta, dict) else {})
        items.append(item)
    return {"items": items}


@app.post("/taste/update")
def taste_update(payload: TasteUpdate) -> dict[str, Any]:
    try:
        current = users.get(ids=[payload.user_id], include=["embeddings"])
    except chromadb.errors.InvalidCollectionException:
        current = {"ids": [], "embeddings": []}

    embeddings_raw = current.get("embeddings")
    if embeddings_raw is None:
        embeddings_raw = []
    embeddings = [np.array(e, dtype="float32") for e in embeddings_raw]
    user_vec: np.ndarray | None = embeddings[0] if embeddings else None

    mood_res = artworks.get(
        ids=[payload.win_id] + ([payload.lose_id] if payload.lose_id else []),
        include=["embeddings"],
    )
    mood_embeddings_raw = mood_res.get("embeddings")
    if mood_embeddings_raw is None:
        mood_embeddings_raw = []
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


@app.post("/taste/summarize")
def taste_summarize(payload: TasteSummaryRequest) -> dict[str, Any]:
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

    response = {
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

    # Store summary in user metadata for downstream recommendation context
    try:
        users.upsert(
            ids=[payload.user_id],
            embeddings=[user_vec.tolist()],
            metadatas=[{"taste_summary": summary, "raw_taste_summary": raw_summary}],
        )
    except Exception:  # pragma: no cover
        logger.info("Failed to cache taste summary metadata for user %s", payload.user_id)

    return response


@app.post("/products/recommend", response_model=ProductRecommendationResponse)
def recommend_products_endpoint(payload: ProductRecommendationRequest) -> ProductRecommendationResponse:
    logger.info(
        "recommend_products requested", extra={
            "user_id": payload.user_id,
            "limit": payload.limit,
            "candidate_pool": payload.candidate_pool,
        }
    )
    user_vec = _get_user_vector(payload.user_id)

    candidates = _query_products_by_vector(user_vec, payload.candidate_pool)
    if not candidates:
        raise HTTPException(status_code=404, detail="No product candidates found")

    # Optional: reuse cached taste summary if available
    try:
        summary_res = users.get(ids=[payload.user_id], include=["metadatas"])
        metas = _ensure_sequence(summary_res.get("metadatas"))
        taste_summary = None
        for meta in metas:
            if isinstance(meta, dict) and meta.get("taste_summary"):
                taste_summary = meta["taste_summary"]
                break
    except chromadb.errors.InvalidCollectionException:
        taste_summary = None

    system_prompt, user_payload = _build_claude_payload(payload.user_id, user_vec, taste_summary, candidates)

    try:
        claude_res = recommend_products(
            system_prompt=system_prompt,
            user_content=user_payload,
            model=ANTHROPIC_MODEL,
            max_tokens=800,
        )
    except ClaudeSettingsError as exc:
        logger.error("Claude recommendation missing settings", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Claude recommendation failed for user %s", payload.user_id)
        raise HTTPException(status_code=502, detail="Claude recommendation failed") from exc

    parsed = claude_res.get("parsed") or {}
    recs = parsed.get("recommendations") if isinstance(parsed, dict) else None
    claude_scores: dict[str, dict[str, Any]] = {}
    if isinstance(recs, list):
        for entry in recs:
            if isinstance(entry, dict) and entry.get("id"):
                claude_scores[entry["id"]] = entry

    merged = _merge_scores(candidates, claude_scores)
    limited = merged[: max(1, payload.limit)]

    logger.info(
        "recommend_products returning", extra={
            "user_id": payload.user_id,
            "returned": len(limited),
            "claude_scored": len(claude_scores),
        }
    )

    return ProductRecommendationResponse(user_id=payload.user_id, items=limited)


def _get_user_vector(user_id: str) -> np.ndarray:
    try:
        user_res = users.get(ids=[user_id], include=["embeddings", "metadatas"])
    except chromadb.errors.InvalidCollectionException as exc:
        raise HTTPException(status_code=404, detail="User collection not initialized") from exc

    embeddings_raw = _ensure_sequence(user_res.get("embeddings"))
    if len(embeddings_raw) == 0:
        raise HTTPException(status_code=404, detail="User taste vector not found")

    return np.array(embeddings_raw[0], dtype="float32")


def _query_products_by_vector(user_vec: np.ndarray, candidate_pool: int) -> list[dict[str, Any]]:
    pool = max(candidate_pool, 1)
    res = products.query(
        query_embeddings=[user_vec.tolist()],
        n_results=pool,
        include=["metadatas", "distances"],
    )

    ids = _first_list(res.get("ids"))
    metas = _first_list(res.get("metadatas"))
    distances = _first_list(res.get("distances"))

    candidates: list[dict[str, Any]] = []
    for idx, meta, dist in zip(ids, metas, distances):
        if meta is None:
            continue
        metadata = _parse_metadata(meta) if isinstance(meta, dict) else {}
        cosine = float(1 - dist) if dist is not None else 0.0
        candidates.append({
            "id": idx,
            "cosine_similarity": cosine,
            "metadata": metadata,
        })
    return candidates


def _build_claude_payload(user_id: str, user_vec: np.ndarray, taste_summary: dict[str, Any] | None, candidates: list[dict[str, Any]]) -> tuple[str, str]:
    preview = user_vec[:12].tolist()
    system_prompt = (
        "You are an interior design critic. Score each candidate product between 0 and 1 "
        "based on how well it fits the user's taste summary and vector preview. "
        "Return JSON with the shape: {\"recommendations\": [{\"id\": string, \"score\": number, \"reason\": string}]}. "
        "Score should reflect stylistic fit, materials, and room applicability. Only return JSON."
    )

    payload = {
        "user_id": user_id,
        "vector_preview": preview,
        "taste_summary": taste_summary or {},
        "candidates": [],
    }

    for item in candidates:
        meta = item.get("metadata", {})
        payload["candidates"].append({
            "id": item.get("id"),
            "cosine_similarity": item.get("cosine_similarity", 0.0),
            "name": meta.get("name"),
            "brand": meta.get("brand"),
            "category": meta.get("category"),
            "materials": meta.get("materials"),
            "colors": meta.get("colors"),
            "style_tags": meta.get("style_tags"),
            "roomTypes": meta.get("roomTypes"),
            "description": meta.get("description"),
        })

    return system_prompt, json.dumps(payload, indent=2)
