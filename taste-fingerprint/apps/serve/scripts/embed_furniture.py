from __future__ import annotations

"""
Embed furniture catalog items into ChromaDB using CLIP image embeddings.
Run this script to populate the 'furnitures' collection with searchable items.
"""

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

from apps.serve.services.embeddings import embed_image, embed_text

load_dotenv()

CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")

if not all([CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE]):
    raise RuntimeError("Missing Chroma Cloud configuration: set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE")

FURNITURE_JSON = ROOT_DIR / "packages/catalog/furniture.json"
PUBLIC_ROOT = ROOT_DIR / "apps/web/public"

client = chromadb.CloudClient(
    api_key=CHROMA_API_KEY,
    tenant=CHROMA_TENANT,
    database=CHROMA_DATABASE,
)

# Create furniture collection with cosine similarity
collection = client.get_or_create_collection("furnitures", metadata={"hnsw:space": "cosine"})


def generate_text_description(item: dict) -> str:
    """Generate a rich text description for text embedding."""
    parts = [
        item.get("name", ""),
        item.get("description", ""),
        item.get("category", ""),
        item.get("subcategory", ""),
        " ".join(item.get("styleTags", [])),
        " ".join(item.get("colors", []))
    ]
    return " ".join(filter(None, parts))


def main() -> None:
    print(f"Loading furniture catalog from {FURNITURE_JSON}")
    data = json.loads(FURNITURE_JSON.read_text())
    
    ids: list[str] = []
    embeddings: list[list[float]] = []
    metadatas: list[dict] = []

    for entry in data:
        item_id = entry["id"]
        print(f"Processing {item_id}...")
        
        # Try to load image for embedding, fall back to text description
        img_path = PUBLIC_ROOT / entry["image_url"].lstrip("/")
        
        if img_path.exists():
            print(f"  - Using image embedding from {img_path.name}")
            with Image.open(img_path).convert("RGB") as img:
                vec = embed_image(img)
        else:
            # Fallback: use text embedding
            print(f"  - Image not found, using text embedding")
            text_desc = generate_text_description(entry)
            vec = embed_text(text_desc)
        
        # Prepare metadata (ChromaDB supports string, int, float, bool)
        metadata = {
            "name": entry.get("name", ""),
            "category": entry.get("category", ""),
            "subcategory": entry.get("subcategory", ""),
            "description": entry.get("description", ""),
            "image_url": entry.get("image_url", ""),
            "model_url": entry.get("model_url", ""),
            "model_format": entry.get("model_format", "gltf"),
            # Dimensions as separate fields for filtering
            "width": float(entry.get("dimensions", {}).get("width", 0)),
            "depth": float(entry.get("dimensions", {}).get("depth", 0)),
            "height": float(entry.get("dimensions", {}).get("height", 0)),
            "unit": entry.get("dimensions", {}).get("unit", "inches"),
            # Store arrays as JSON strings (ChromaDB limitation)
            "styleTags": json.dumps(entry.get("styleTags", [])),
            "colors": json.dumps(entry.get("colors", []))
        }
        
        ids.append(item_id)
        embeddings.append(vec.tolist())
        metadatas.append(metadata)
    
    # Clear existing data and insert new (respecting ChromaDB quota limits)
    print(f"\nClearing existing furniture collection...")
    try:
        existing = collection.get(limit=300)  # ChromaDB free tier limit
        existing_ids = existing.get("ids") or []
        if existing_ids:
            collection.delete(ids=existing_ids)
            print(f"  - Deleted {len(existing_ids)} existing items")
    except Exception as e:
        print(f"  - Could not clear collection: {e}")
        print(f"  - Will upsert anyway (will overwrite existing items with same IDs)")
    
    print(f"\nUpserting {len(ids)} furniture items to ChromaDB...")
    collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas)
    
    print(f"✓ Successfully embedded {len(ids)} furniture items into '{CHROMA_DATABASE}.furnitures' collection")
    print(f"\nCollection stats:")
    print(f"  - Furniture items: {len([m for m in metadatas if m['category'] == 'furniture'])}")
    print(f"  - Lighting items: {len([m for m in metadatas if m['category'] == 'lighting'])}")
    print(f"  - Paintings: {len([m for m in metadatas if m['category'] == 'painting'])}")


if __name__ == "__main__":
    main()
