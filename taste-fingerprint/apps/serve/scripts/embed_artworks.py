from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import chromadb
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
    raise RuntimeError("Missing Chroma Cloud configuration: set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE")

ARTWORKS_JSON = ROOT_DIR / "packages/catalog/artworks.json"
PUBLIC_ROOT = ROOT_DIR / "apps/web/public"

client = chromadb.CloudClient(
    api_key=CHROMA_API_KEY,
    tenant=CHROMA_TENANT,
    database=CHROMA_DATABASE,
)
collection = client.get_or_create_collection("artworks", metadata={"hnsw:space": "cosine"})


def main() -> None:
    data = json.loads(ARTWORKS_JSON.read_text())
    ids: list[str] = []
    embeddings: list[list[float]] = []
    metadatas: list[dict[str, str]] = []

    for entry in data:
        img_path = PUBLIC_ROOT / entry["image_url"].lstrip("/")
        if not img_path.exists():
            raise FileNotFoundError(f"Missing artwork image: {img_path}")

        with Image.open(img_path).convert("RGB") as img:
            vec = embed_image(img)

        ids.append(entry["id"])
        embeddings.append(vec.tolist())
        metadata: dict[str, str] = {
            "title": entry.get("title", ""),
            "artist": entry.get("artist", ""),
            "museum": entry.get("museum", ""),
            "image_url": entry.get("image_url", ""),
        }

        for key in ("style_tags", "palette_keywords", "material_inspirations", "mood_keywords"):
            value = entry.get(key)
            if value:
                metadata[key] = json.dumps(value)

        metadatas.append(metadata)

    existing = collection.get(limit=300)
    existing_ids = existing.get("ids") or []
    if existing_ids:
        collection.delete(ids=existing_ids)

    collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas)
    print(f"Embedded {len(ids)} artworks into Chroma Cloud database '{CHROMA_DATABASE}'.")


if __name__ == "__main__":
    main()
