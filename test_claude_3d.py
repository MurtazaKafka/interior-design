#!/usr/bin/env python3
"""Lightweight tests for Claude-driven 3D generation utilities.

These tests avoid calling external services by default so that the suite stays fast.
Set ``RUN_CLAUDE_INTEGRATION=1`` to exercise the live FastAPI endpoint.
"""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from typing import Any, Iterable

import pytest  # type: ignore[import-not-found]
import requests  # type: ignore[import-not-found]


_MODULE_PATH = (
    Path(__file__).resolve().parent
    / "taste-fingerprint"
    / "apps"
    / "serve"
    / "services"
    / "claude_3d_generator.py"
)

_SPEC = importlib.util.spec_from_file_location("claude_3d_generator", _MODULE_PATH)
if _SPEC is None or _SPEC.loader is None:  # pragma: no cover - import guard
    raise ImportError(f"Unable to load Claude3DGenerator from {_MODULE_PATH}")

_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
Claude3DGenerator = getattr(_MODULE, "Claude3DGenerator")


def _assert_valid_three_js(code: str) -> None:
    assert "function createFurniture" in code
    assert "THREE.Group" in code


def _run_generator(
    generator: Any,
    *,
    furniture_type: str,
    style: str,
    colors: Iterable[str],
    materials: Iterable[str],
) -> str:
    return generator.generate_furniture_code(
        furniture_type=furniture_type,
        style=style,
        colors=colors,
        materials=materials,
        dimensions={"width": 1.0, "depth": 0.6, "height": 0.8},
    )


def test_fallback_generation_fast() -> None:
    """Ensure fallback code works without calling Anthropic."""

    generator = Claude3DGenerator(api_key="dummy")
    code = _run_generator(
        generator,
        furniture_type="sofa",
        style="scandinavian",
        colors=["cream", "oak"],
        materials=["fabric", "wood"],
    )

    _assert_valid_three_js(code)
    assert "// FALLBACK_CODE" in code


@pytest.mark.skipif(
    os.getenv("RUN_CLAUDE_INTEGRATION") != "1",
    reason="Claude integration test disabled; set RUN_CLAUDE_INTEGRATION=1 to enable",
)
def test_claude_3d_generation_endpoint() -> None:
    """Optionally exercise the FastAPI endpoint for end-to-end coverage."""

    url = os.getenv("CLAUDE_API_URL", "http://localhost:8000/api/generate-3d")
    payload = {
        "furniture_type": "chair",
        "style": "modern minimalist",
        "colors": ["dark brown", "black"],
        "materials": ["wood", "metal"],
        "dimensions": {"width": 0.5, "depth": 0.5, "height": 1.0},
        "use_cached": True,
    }

    response = requests.post(url, json=payload, timeout=10)
    response.raise_for_status()
    data = response.json()

    code = data.get("code", "")
    _assert_valid_three_js(code)