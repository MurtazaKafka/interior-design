"""Download product imagery referenced in the catalog JSON.

This helper reads the curated `products_unique.json` (or any catalog-like JSON)
and stores each referenced `image_url` under `apps/web/public/products` so the
Next.js front-end can serve them locally.

Usage (from repo root):

    python apps/serve/scripts/download_product_images.py \
        --products packages/catalog/products_unique.json \
        --out apps/web/public/products \
        --rewrite-json

Pass `--force` to re-download files that already exist locally.
Use `--rewrite-json` to replace the `image_url` fields with local paths after
downloading.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests


ROOT_DIR = Path(__file__).resolve().parents[3]


DEFAULT_PRODUCTS_PATH = ROOT_DIR / "packages/catalog/products_unique.json"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "apps/web/public/products"


SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
LOCAL_URL_PREFIX = "/products"


@dataclass
class DownloadResult:
    product_id: str
    url: str
    dest: Path
    skipped: bool = False
    error: str | None = None


def _sanitise_id(value: str) -> str:
    safe_chars = []
    for ch in value:
        if ch.isalnum() or ch in {"-", "_"}:
            safe_chars.append(ch)
        else:
            safe_chars.append("_")
    sanitised = "".join(safe_chars).strip("_")
    return sanitised or "product"


def _infer_suffix(url: str) -> str:
    path = urlparse(url).path
    suffix = Path(path).suffix.lower()
    if suffix in SUPPORTED_SUFFIXES:
        return suffix
    return ".jpg"


def _iter_products(products_path: Path) -> Iterable[dict]:
    payload = json.loads(products_path.read_text())
    if not isinstance(payload, list):
        raise ValueError(f"Expected a list in {products_path}, found {type(payload)}")
    return payload


def _download_image(url: str, dest: Path, *, timeout: float = 20.0) -> None:
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    dest.write_bytes(response.content)


def download_all(
    products_path: Path,
    output_dir: Path,
    *,
    force: bool = False,
) -> list[DownloadResult]:
    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[DownloadResult] = []

    for entry in _iter_products(products_path):
        product_id = entry.get("id") or "unknown"
        image_url = entry.get("image_url")

        if not image_url:
            results.append(
                DownloadResult(
                    product_id=product_id,
                    url="",
                    dest=output_dir,
                    error="missing image_url",
                )
            )
            continue

        filename = _sanitise_id(product_id) + _infer_suffix(image_url)
        dest_path = output_dir / filename

        if dest_path.exists() and not force:
            results.append(
                DownloadResult(product_id=product_id, url=image_url, dest=dest_path, skipped=True)
            )
            continue

        try:
            _download_image(image_url, dest_path)
            results.append(DownloadResult(product_id=product_id, url=image_url, dest=dest_path))
        except Exception as exc:  # pragma: no cover - network dependent
            results.append(
                DownloadResult(
                    product_id=product_id,
                    url=image_url,
                    dest=dest_path,
                    error=str(exc),
                )
            )

    return results


def rewrite_image_urls(products_path: Path, mapping: dict[str, str]) -> int:
    original = products_path.read_bytes()
    data = json.loads(original)
    changed = 0

    for entry in data:
        product_id = entry.get("id")
        if not product_id:
            continue
        filename = mapping.get(product_id)
        if not filename:
            continue
        local_url = f"{LOCAL_URL_PREFIX}/{filename}"
        if entry.get("image_url") != local_url:
            entry["image_url"] = local_url
            changed += 1

    if changed:
        products_path.write_text(json.dumps(data, indent=2) + "\n")
    else:
        products_path.write_bytes(original)

    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description="Download product catalog images")
    parser.add_argument(
        "--products",
        type=Path,
        default=DEFAULT_PRODUCTS_PATH,
        help="Path to the product catalog JSON",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory to store downloaded images",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download files even if they already exist",
    )
    parser.add_argument(
        "--rewrite-json",
        action="store_true",
        help="Update image_url fields in the catalog to point at local assets",
    )

    args = parser.parse_args()

    results = download_all(args.products, args.out, force=args.force)

    downloaded = sum(1 for r in results if not r.skipped and not r.error)
    skipped = sum(1 for r in results if r.skipped)
    errors = [r for r in results if r.error]

    print(f"Downloaded: {downloaded}")
    print(f"Skipped (already present): {skipped}")
    if errors:
        print("Errors:")
        for res in errors:
            print(f"  {res.product_id}: {res.error}")

    if args.rewrite_json:
        mapping = {
            res.product_id: res.dest.name
            for res in results
            if not res.error and res.dest.is_file()
        }
        updated = rewrite_image_urls(args.products, mapping)
        print(f"Rewrote {updated} image_url values in {args.products}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())


