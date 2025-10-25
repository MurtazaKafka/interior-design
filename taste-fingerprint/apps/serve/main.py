from __future__ import annotations

import os
from typing import Any

import chromadb
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")

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


class Artwork(BaseModel):
    id: str
    title: str
    artist: str
    museum: str
    image_url: str


class TasteUpdate(BaseModel):
    user_id: str
    win_id: str
    lose_id: str | None = None


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

    def _ensure_list(value):
        if hasattr(value, "tolist"):
            return value.tolist()
        return value

    ids = _ensure_list(ids)
    metas = [_ensure_list(meta) for meta in metas]

    items = []
    for idx, meta in zip(ids, metas):
        if meta is None:
            continue
        item = {"id": idx}
        item.update(meta)
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
