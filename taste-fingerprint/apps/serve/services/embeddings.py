from __future__ import annotations

"""Shared CLIP embedding utilities for the FurnishML backend and ingest scripts."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

import numpy as np
import torch
from transformers import CLIPModel, CLIPProcessor

ModelName = Literal["openai/clip-vit-base-patch32"]


@lru_cache(maxsize=1)
def _load_processor(model_name: ModelName) -> CLIPProcessor:
    return CLIPProcessor.from_pretrained(model_name)


@lru_cache(maxsize=1)
def _load_model(model_name: ModelName) -> CLIPModel:
    model = CLIPModel.from_pretrained(model_name)
    model.eval()
    return model


def _to_numpy(vec: torch.Tensor) -> np.ndarray:
    arr = vec[0].detach().cpu().numpy().astype("float32")
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr /= norm
    return arr


def embed_image(pil_image, *, model_name: ModelName = "openai/clip-vit-base-patch32") -> np.ndarray:
    processor = _load_processor(model_name)
    model = _load_model(model_name)
    with torch.no_grad():
        inputs = processor(images=pil_image, return_tensors="pt")
        vectors = model.get_image_features(**inputs)
    return _to_numpy(vectors)


def embed_text(text: str, *, model_name: ModelName = "openai/clip-vit-base-patch32") -> np.ndarray:
    processor = _load_processor(model_name)
    model = _load_model(model_name)
    with torch.no_grad():
        inputs = processor(text=[text], return_tensors="pt", padding=True)
        vectors = model.get_text_features(**inputs)
    return _to_numpy(vectors)


__all__ = ["embed_image", "embed_text"]
