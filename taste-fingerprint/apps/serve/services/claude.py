from __future__ import annotations

"""Anthropic Claude client helpers for taste vector summarization."""

import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict

from anthropic import Anthropic


logger = logging.getLogger(__name__)


class ClaudeSettingsError(RuntimeError):
    """Raised when Anthropic configuration is missing."""


@lru_cache(maxsize=1)
def _client() -> Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ClaudeSettingsError("Missing ANTHROPIC_API_KEY environment variable")
    return Anthropic(api_key=api_key)



def summarize_taste(prompt: str, *, model: str, max_tokens: int = 1_024) -> Dict[str, Any]:
    """Call Claude with JSON instructions and return parsed content."""

    client = _client()
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    usage_payload = response.usage.model_dump() if hasattr(response.usage, "model_dump") else response.usage
    data: Dict[str, Any] = {
        "id": response.id,
        "usage": usage_payload,
    }

    text_blocks = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text_blocks.append(getattr(block, "text", ""))

    combined_text = "".join(text_blocks).strip()
    if combined_text.startswith("```"):
        fence_lines = combined_text.splitlines()
        if fence_lines and fence_lines[0].strip().startswith("```"):
            fence_lines = fence_lines[1:]
        if fence_lines and fence_lines[-1].strip().startswith("```"):
            fence_lines = fence_lines[:-1]
        combined_text = "\n".join(fence_lines).strip()
    data["raw_text"] = combined_text
    if combined_text:
        logger.warning("Claude raw text for taste summary: %s", combined_text)
        try:
            data["parsed"] = json.loads(combined_text)
        except json.JSONDecodeError:
            data["parsed"] = None
            logger.warning("Claude response was not valid JSON; delivering raw text")
    else:
        data["parsed"] = None
        logger.warning("Claude returned empty content for taste summary request")

    return data


def recommend_products(
    *,
    system_prompt: str,
    user_content: str,
    model: str,
    max_tokens: int = 1_024,
    temperature: float = 0.3,
) -> Dict[str, Any]:
    client = _client()
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
        temperature=temperature,
    )

    usage_payload = response.usage.model_dump() if hasattr(response.usage, "model_dump") else response.usage
    data: Dict[str, Any] = {
        "id": response.id,
        "usage": usage_payload,
    }

    text_blocks = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text_blocks.append(getattr(block, "text", ""))

    combined_text = "".join(text_blocks).strip()
    if combined_text.startswith("```"):
        fence_lines = combined_text.splitlines()
        if fence_lines:
            fence_lines = fence_lines[1:]
        while fence_lines and fence_lines[-1].strip().startswith("```"):
            fence_lines.pop()
        combined_text = "\n".join(fence_lines).strip()
    data["raw_text"] = combined_text
    if combined_text:
        try:
            data["parsed"] = json.loads(combined_text)
        except json.JSONDecodeError:
            data["parsed"] = None
            logger.warning("Claude recommendation response not valid JSON: %s", combined_text)
    else:
        data["parsed"] = None
        logger.warning("Claude returned empty content for product recommendation request")

    return data


def craft_room_edit_prompt(context: Dict[str, Any], *, model: str, max_tokens: int = 600, temperature: float = 0.2) -> Dict[str, Any]:
    """Ask Claude to craft a single prompt string for OpenAI image edits."""

    client = _client()
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=(
            "You are an interior design prompt engineer. Given context about a user's taste summary, "
            "room traits, and candidate furniture pieces, craft a single detailed text prompt suitable "
            "for an image editing model that decorates a room photo. Return JSON with a single key "
            "'prompt' whose value is the prompt string. The prompt should reference the furniture, "
            "materials, palette, and styling cues explicitly. Keep it under 120 words."
        ),
        messages=[{"role": "user", "content": json.dumps(context, indent=2)}],
    )

    text_blocks = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text_blocks.append(getattr(block, "text", ""))

    combined_text = "".join(text_blocks).strip()

    def _strip_fence(text: str) -> str:
        if not text.startswith("```"):
            return text
        fence_lines = text.splitlines()
        if fence_lines and fence_lines[0].strip().startswith("```"):
            fence_lines = fence_lines[1:]
        while fence_lines and fence_lines[-1].strip().startswith("```"):
            fence_lines.pop()
        return "\n".join(fence_lines).strip()

    combined_text = _strip_fence(combined_text)

    result: Dict[str, Any] = {"raw_text": combined_text}
    if not combined_text:
        logger.warning("Claude returned empty content for room prompt request")
        result["prompt"] = None
        return result

    try:
        parsed = json.loads(combined_text)
    except json.JSONDecodeError:
        logger.warning("Claude prompt response not valid JSON: %s", combined_text)
        result["prompt"] = combined_text
        return result

    prompt_value = parsed.get("prompt") if isinstance(parsed, dict) else None
    if isinstance(prompt_value, str) and prompt_value.strip():
        result["prompt"] = prompt_value.strip()
    else:
        logger.warning("Claude prompt JSON missing 'prompt' key, falling back to raw text")
        result["prompt"] = combined_text
    return result


__all__ = [
    "summarize_taste",
    "recommend_products",
    "ClaudeSettingsError",
]

