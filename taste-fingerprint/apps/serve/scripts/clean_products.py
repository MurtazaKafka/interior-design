"""Clean raw Amazon product data into the catalog schema.

This script reads the messy scrape stored in `packages/catalog/products.json`
and emits a curated furniture + lighting catalog that matches the JSON
structure documented in `docs/prompt-experiments.md`.

Usage (from repo root):

    python apps/serve/scripts/clean_products.py \
        --raw packages/catalog/products.json \
        --out packages/catalog/products_clean.json

The script intentionally keeps the output separate from the raw file so we can
review the transformation before swapping it in downstream pipelines.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional


# ---------------------------------------------------------------------------
# Constants & heuristics
# ---------------------------------------------------------------------------

ALLOWED_FIELDS = {
    "id",
    "name",
    "brand",
    "category",
    "roomTypes",
    "price",
    "currency",
    "buy_url",
    "image_url",
    "dimensions_in",
    "materials",
    "colors",
    "style_tags",
    "description",
    "scraped_at",
    "lighting_type",
}

CATEGORY_KEYWORDS = {
    "sofa": ["sofa", "sectional", "loveseat", "couch", "settee"],
    "chair": ["armchair", "accent chair", "recliner", "lounger", "stool", "bench"],
    "table": ["table", "desk", "console", "nightstand", "side table", "coffee table", "dining table"],
    "storage": ["dresser", "cabinet", "sideboard", "credenza", "bookcase", "shelving", "wardrobe"],
    "bed": ["platform bed", "bed frame", "headboard", "canopy bed"],
    "lamp": ["lamp", "sconce", "chandelier", "pendant", "lighting", "light fixture", "floor lamp", "table lamp"],
    "rug": ["rug", "runner"],
    "decor": ["mirror", "wall art", "planter", "vase"],
}
BANNED_TITLE_KEYWORDS = [
    "hamper",
    "laundry basket",
    "mattress topper",
    "mattress pad",
    "protector",
    "sheet",
    "pillow",
    "blanket",
    "duvet",
]

ROOMTYPE_BY_CATEGORY = {
    "sofa": ["living"],
    "chair": ["living", "bedroom"],
    "table": ["living", "bedroom"],
    "storage": ["living", "bedroom"],
    "bed": ["bedroom"],
    "lamp": ["living", "bedroom"],
    "rug": ["living", "bedroom"],
    "decor": ["living"],
}


DIMENSION_LABEL_MAP = {
    "l": "d",
    "length": "d",
    "d": "d",
    "depth": "d",
    "w": "w",
    "width": "w",
    "h": "h",
    "height": "h",
}


UNIT_TO_INCH = {
    "in": 1.0,
    "inch": 1.0,
    "inches": 1.0,
    '"': 1.0,
    "ft": 12.0,
    "feet": 12.0,
    "foot": 12.0,
    "cm": 0.393701,
    "centimeter": 0.393701,
    "centimeters": 0.393701,
    "mm": 0.0393701,
    "millimeter": 0.0393701,
    "millimeters": 0.0393701,
}


DESCRIPTION_MAX_CHARS = 420


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def slugify(value: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower())
    slug = slug.strip("-")
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("-")
    return slug or "item"


def first(iterable: Iterable[str]) -> Optional[str]:
    for value in iterable:
        if value:
            return value
    return None


def normalize_list(values: Iterable[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if not value:
            continue
        clean = value.strip()
        if not clean:
            continue
        clean = clean.lower()
        if clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result


def split_on_delimiters(text: str) -> list[str]:
    parts = re.split(r"[,/;]|\band\b|\bor\b", text, flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


def extract_detail(item: dict, *detail_keys: str) -> Optional[str]:
    details = item.get("product_details") or []
    detail_map = {d.get("type", "").strip().lower(): d.get("value") for d in details}
    for key in detail_keys:
        val = detail_map.get(key.lower())
        if val:
            return val
    return None


CLEAN_CATEGORY_OVERRIDES = {
    "bench": "chair",
    "ottoman": "chair",
}

DIMENSION_RE = re.compile(
    r"""
    (?P<value>[0-9]+(?:\.[0-9]+)?)
    \s*
    (?P<unit>cm|centimeter|centimeters|mm|millimeter|millimeters|ft|feet|foot|in|inch|inches|\")?
    \s*
    (?P<label>[ldwh]{1}|length|depth|width|height)?
    """,
    re.IGNORECASE | re.VERBOSE,
)


def parse_dimensions(text: str) -> Optional[dict[str, float]]:
    if not text:
        return None

    text = text.replace("—", "-").replace("×", "x")
    segments = re.split(r"\s*[x×]\s*", text)
    values = {"w": None, "d": None, "h": None}

    for segment in segments:
        match = DIMENSION_RE.search(segment)
        if not match:
            continue
        raw_value = float(match.group("value"))
        unit = (match.group("unit") or '"').lower()
        label = (match.group("label") or "").lower()
        label = DIMENSION_LABEL_MAP.get(label, label)

        multiplier = UNIT_TO_INCH.get(unit)
        if not multiplier:
            continue
        inches = raw_value * multiplier

        if label in values:
            values[label] = inches
        else:
            # fallback to positional assignment later
            values.setdefault("_fallback", []).append(inches)

    # Fill missing with fallback positional assumption (L/W/H -> d/w/h)
    fallback = values.pop("_fallback", [])
    if fallback:
        for key, val in zip(["d", "w", "h"], fallback):
            if values[key] is None:
                values[key] = val

    if None in values.values():
        return None

    return {k: round(v, 2) for k, v in values.items()}


def pick_category(title: str, categories: list[str]) -> Optional[str]:
    title_l = title.lower()
    categories_l = [c.lower() for c in categories]
    # Early reject for banned keywords
    for banned in BANNED_TITLE_KEYWORDS:
        if re.search(rf"\b{re.escape(banned)}\b", title_l):
            return None

    for override, mapped in CLEAN_CATEGORY_OVERRIDES.items():
        if re.search(rf"\b{re.escape(override)}\b", title_l):
            return mapped

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            pattern = rf"\b{re.escape(keyword)}\b"
            if re.search(pattern, title_l) or any(re.search(pattern, c) for c in categories_l):
                return category
    return None


def derive_style_tags(item: dict) -> list[str]:
    tags = []
    style_text = extract_detail(item, "style", "theme", "pattern")
    if style_text:
        tags.extend(split_on_delimiters(style_text))
    features = item.get("features") or []
    if features:
        for feature in features[:3]:
            if len(feature) < 120:
                tags.extend(split_on_delimiters(feature))
    return normalize_list(tags)


def derive_materials(item: dict) -> list[str]:
    materials = extract_detail(item, "material", "materials", "frame material", "fabric type")
    if not materials:
        return []
    return normalize_list(split_on_delimiters(materials))


def derive_colors(item: dict) -> list[str]:
    color = extract_detail(item, "color", "finish type", "finish types")
    if not color:
        return []
    return normalize_list(split_on_delimiters(color))


def derive_lighting_type(item: dict) -> Optional[str]:
    lighting = extract_detail(
        item,
        "light type",
        "light source type",
        "lighting type",
        "special feature",
    )
    if not lighting:
        return None
    candidates = normalize_list(split_on_delimiters(lighting))
    return candidates[0] if candidates else None


def build_description(item: dict) -> Optional[str]:
    description = first([item.get("description"), item.get("top_review")])
    if not description:
        return None
    description = " ".join(description.split())
    return description[:DESCRIPTION_MAX_CHARS]


def extract_price(item: dict) -> Optional[float]:
    price = first([item.get("final_price"), item.get("initial_price")])
    if price is None:
        return None
    try:
        return round(float(price), 2)
    except (TypeError, ValueError):
        return None


def build_id(category: str, name: str, asin: str | None) -> str:
    slug = slugify(name)
    if asin:
        slug = f"{slug[: max(16, len(slug))]}-{asin.lower()}"
        slug = slugify(slug)
    return f"furn_{category}_{slug}_v01"


@dataclass
class TransformResult:
    item: dict
    reason: Optional[str] = None


def transform_item(raw: dict) -> TransformResult:
    title = (raw.get("title") or "").strip()
    if not title:
        return TransformResult({}, "missing_title")

    categories = raw.get("categories") or []
    category = pick_category(title, categories)
    if not category:
        return TransformResult({}, "category_filter")

    dimensions_text = first(
        [
            raw.get("product_dimensions"),
            extract_detail(raw, "product dimensions", "item dimensions lxwxh", "dimensions"),
        ]
    )
    dimensions = parse_dimensions(dimensions_text or "")
    if not dimensions:
        return TransformResult({}, "missing_dimensions")

    materials = derive_materials(raw)
    if not materials:
        return TransformResult({}, "missing_materials")

    colors = derive_colors(raw)
    if not colors:
        return TransformResult({}, "missing_colors")

    style_tags = derive_style_tags(raw)
    if not style_tags:
        style_tags = normalize_list(categories)
    if not style_tags:
        return TransformResult({}, "missing_style_tags")

    price = extract_price(raw)
    if price is None or math.isclose(price, 0.0):
        return TransformResult({}, "missing_price")

    brand = first([raw.get("brand"), extract_detail(raw, "brand", "manufacturer")])
    if not brand:
        brand = "unknown"

    image_url = first(raw.get("images") or [raw.get("image_url")])
    if not image_url:
        return TransformResult({}, "missing_image")

    description = build_description(raw)
    if not description:
        return TransformResult({}, "missing_description")

    room_types = ROOMTYPE_BY_CATEGORY.get(category, ["living"])

    cleaned = {
        "id": build_id(category, title, raw.get("asin")),
        "name": title,
        "brand": brand,
        "category": category,
        "roomTypes": room_types,
        "price": price,
        "currency": raw.get("currency", "USD"),
        "buy_url": raw.get("url"),
        "image_url": image_url,
        "dimensions_in": {k: round(v, 2) for k, v in dimensions.items()},
        "materials": materials,
        "colors": colors,
        "style_tags": style_tags,
        "description": description,
        "scraped_at": raw.get("timestamp"),
    }

    if category == "lamp":
        lighting_type = derive_lighting_type(raw)
        if lighting_type:
            cleaned["lighting_type"] = lighting_type

    # Ensure no unexpected fields leak through
    for key in list(cleaned.keys()):
        if key not in ALLOWED_FIELDS:
            cleaned.pop(key)

    missing_required = [k for k in ("buy_url", "scraped_at") if not cleaned.get(k)]
    if missing_required:
        return TransformResult({}, f"missing_{'-'.join(missing_required)}")

    return TransformResult(cleaned)


def dedupe_key(entry: dict) -> str:
    asin = entry.get("asin")
    if asin:
        return asin.lower()
    return entry.get("image_url", "")


def make_unique_id(base_id: str, seen: set[str]) -> str:
    candidate = base_id
    suffix = 2
    while candidate in seen:
        candidate = f"{base_id}-v{suffix:02d}"
        suffix += 1
    seen.add(candidate)
    return candidate


def clean_products(raw_items: list[dict]) -> tuple[list[dict], Counter]:
    cleaned: list[dict] = []
    rejects = Counter()
    seen_keys: set[str] = set()
    seen_ids: set[str] = set()

    for raw in raw_items:
        result = transform_item(raw)
        if result.reason:
            rejects[result.reason] += 1
            continue
        key = dedupe_key(raw)
        if key and key in seen_keys:
            rejects["duplicate"] += 1
            continue
        if key:
            seen_keys.add(key)
        item = dict(result.item)
        item["id"] = make_unique_id(item["id"], seen_ids)
        cleaned.append(item)

    return cleaned, rejects


def main(raw_path: Path, out_path: Path) -> None:
    raw_items = json.loads(raw_path.read_text())
    cleaned, rejects = clean_products(raw_items)

    out_path.write_text(json.dumps(cleaned, indent=2, sort_keys=False))

    total = len(raw_items)
    print(f"Total raw items: {total}")
    print(f"Cleaned items: {len(cleaned)}")
    if rejects:
        print("Rejected breakdown:")
        for reason, count in rejects.most_common():
            pct = (count / total) * 100
            print(f"  {reason}: {count} ({pct:.1f}%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean product catalog data")
    parser.add_argument(
        "--raw",
        type=Path,
        default=Path("packages/catalog/products.json"),
        help="Path to raw products JSON",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("packages/catalog/products_clean.json"),
        help="Output path for cleaned catalog",
    )
    args = parser.parse_args()

    main(args.raw, args.out)

