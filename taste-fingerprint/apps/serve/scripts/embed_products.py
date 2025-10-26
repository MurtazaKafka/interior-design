"""Embed cleaned furniture catalog entries into the Chroma `products` collection.

This mirrors `embed_artworks.py` but pulls images from remote URLs on demand.
Images are cached on disk to avoid repeated downloads across runs.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from io import BytesIO
from pathlib import Path
from typing import Any

import chromadb
import requests
from PIL import Image
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from apps.serve.services.embeddings import embed_image

load_dotenv()

CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")

if not all([CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE]):
    raise RuntimeError(
        "Missing Chroma Cloud configuration: set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE"
    )

PRODUCTS_JSON = ROOT_DIR / "packages/catalog/products_unique.json"
PUBLIC_DIR = ROOT_DIR / "apps/web/public"
CACHE_DIR = ROOT_DIR / "apps/serve/.cache/product_images"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

client = chromadb.CloudClient(
    api_key=CHROMA_API_KEY,
    tenant=CHROMA_TENANT,
    database=CHROMA_DATABASE,
)
collection = client.get_or_create_collection("products", metadata={"hnsw:space": "cosine"})


def _cache_path(url: str) -> Path:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.bin"


def _load_image(url: str, timeout: float = 10.0) -> Image.Image:
    parsed = requests.utils.urlparse(url)

    if parsed.scheme in ("http", "https"):
        cache_file = _cache_path(url)
        if cache_file.exists():
            data = cache_file.read_bytes()
        else:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            data = resp.content
            cache_file.write_bytes(data)
        return Image.open(BytesIO(data)).convert("RGB")

    if not parsed.scheme and url.startswith("/"):
        local_path = PUBLIC_DIR / url.lstrip("/")
        if not local_path.exists():
            raise FileNotFoundError(f"Local image not found: {local_path}")
        return Image.open(local_path).convert("RGB")

    raise ValueError(f"Unsupported image URL: {url}")


def _prepare_metadata(entry: dict[str, Any]) -> dict[str, str]:
    metadata: dict[str, str] = {
        "name": entry.get("name", ""),
        "brand": entry.get("brand", ""),
        "category": entry.get("category", ""),
        "buy_url": entry.get("buy_url", ""),
        "image_url": entry.get("image_url", ""),
        "currency": entry.get("currency", ""),
        "price": str(entry.get("price", "")),
        "description": entry.get("description", ""),
        "scraped_at": entry.get("scraped_at", ""),
    }

    for key in ("materials", "colors", "style_tags", "roomTypes"):
        value = entry.get(key)
        if value:
            metadata[key] = json.dumps(value)

    lighting_type = entry.get("lighting_type")
    if lighting_type:
        metadata["lighting_type"] = lighting_type

    return metadata


def main() -> None:
    data = json.loads(PRODUCTS_JSON.read_text())

    ids: list[str] = []
    embeddings: list[list[float]] = []
    metadatas: list[dict[str, str]] = []

    for entry in data:
        image_url = entry.get("image_url")
        if not image_url:
            raise ValueError(f"Entry {entry.get('id')} missing image_url")

        image = _load_image(image_url)
        vec = embed_image(image)

        ids.append(entry["id"])
        embeddings.append(vec.tolist())
        metadatas.append(_prepare_metadata(entry))

    existing = collection.get(limit=300)
    existing_ids = existing.get("ids") or []
    if existing_ids:
        collection.delete(ids=existing_ids)

    collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas)
    print(f"Embedded {len(ids)} products into Chroma Cloud database '{CHROMA_DATABASE}'.")


if __name__ == "__main__":
    main()

