"""
Claude Sonnet 4.5 3D Model Generator Service
Generates Three.js code for furniture using Claude's latest model.
"""

from __future__ import annotations

import importlib
import logging
import os
from typing import Any, Dict, Iterable, Optional

AnthropicClient = Any

logger = logging.getLogger(__name__)


class Claude3DGenerator:
    """Service for generating 3D furniture models using Claude Sonnet 4.5."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key is required")

        self.model_id = "claude-sonnet-4-5"
        self.client: Optional[AnthropicClient] = None

        if self.api_key == "dummy":
            logger.info("Anthropic client disabled (dummy key); using fallback furniture code")
            return

        try:
            module = importlib.import_module("anthropic")
            client_factory = getattr(module, "Anthropic")
            self.client = client_factory(api_key=self.api_key)
        except ModuleNotFoundError:
            logger.warning("anthropic package not installed; falling back to static models")
        except Exception as exc:  # pragma: no cover - network dependency
            logger.warning("Failed to initialise Anthropic client: %s", exc)

    def generate_furniture_code(
        self,
        furniture_type: str,
        style: str,
        colors: Iterable[str],
        materials: Iterable[str],
        dimensions: Optional[Dict[str, float]] = None,
        max_tokens: int = 2800,
    ) -> str:
        """Generate Three.js code for a furniture item via Claude or fallback."""

        prompt = self._build_prompt(
            furniture_type=furniture_type,
            style=style,
            colors=list(colors),
            materials=list(materials),
            dimensions=dimensions or {},
        )

        if not self.client:
            logger.debug("Anthropic client missing; returning fallback code for %s", furniture_type)
            return self._get_fallback_code(furniture_type)

        try:
            response = self.client.messages.create(
                model=self.model_id,
                max_tokens=max_tokens,
                temperature=0.6,
                messages=[{"role": "user", "content": prompt}],
            )

            generated_text = response.content[0].text if response.content else ""
            code = self._extract_code(generated_text)

            if not code.strip():  # pragma: no cover - defensive guard
                raise ValueError("Claude returned an empty response")

            logger.info("Successfully generated 3D code for %s", furniture_type)
            return code

        except Exception as exc:  # pragma: no cover - network dependency
            logger.error("Failed to generate 3D code via Claude: %s", exc)
            return self._get_fallback_code(furniture_type)

    # ------------------------------------------------------------------
    # Prompt construction helpers

    def _build_prompt(
        self,
        furniture_type: str,
        style: str,
        colors: list[str],
        materials: list[str],
        dimensions: Dict[str, float],
    ) -> str:
        color_text = ", ".join(colors) if colors else "neutral palette"
        material_text = ", ".join(materials) if materials else "wood"
        dimension_text = self._format_dimensions(dimensions)
        shininess = self._get_material_shininess(materials)

        requirements = self._get_furniture_specific_requirements(furniture_type)

        return f"""You are an expert Three.js developer.
Design a {style} {furniture_type} that matches this specification and output only executable JavaScript.

STRICT OUTPUT RULES:
1. Return a function named `createFurniture` that returns a `THREE.Group`.
2. Use only core Three.js primitives and materials. Do not load external assets or textures.
3. Materials should use `THREE.MeshPhongMaterial` with shininess around {shininess}.
4. Set realistic positions, scales, and rotations. Ensure the object is centred around the origin.
5. Add small lighting helpers like `THREE.PointLight` when appropriate.
6. Include comments explaining the major sections of the model.

Visual palette: {color_text}
Primary materials: {material_text}
{dimension_text}

Functional requirements:
{requirements}

Return only the JavaScript function body – no Markdown, explanations, or backticks.
"""

    @staticmethod
    def _format_dimensions(dimensions: Dict[str, float]) -> str:
        if not dimensions:
            return "Approximate furniture size: standard proportions for the chosen type."

        parts = []
        for key in ("width", "depth", "height"):
            if key in dimensions:
                parts.append(f"{key}: {dimensions[key]:.2f}m")
        return "Approximate dimensions: " + ", ".join(parts)

    def _get_furniture_specific_requirements(self, furniture_type: str) -> str:
        requirements = {
            "bed": """
- Create a bed frame with headboard
- Add a mattress and pillows on top of the frame
- Headboard should be taller and decorative
- Frame should be raised off the ground with legs""",
            "nightstand": """
- Small bedside table with 1-2 drawers
- Include a flat top surface for a lamp or books
- Height should align with a typical bed""",
            "sofa": """
- Include seat cushions, back cushions, and armrests
- Seat should be lower than the backrest
- Add visible legs or a base platform""",
            "chair": """
- Include seat, backrest, and four legs
- Slight backward angle on the backrest for comfort
- Optional armrests depending on style""",
            "table": """
- Flat tabletop with supporting legs or pedestal
- Ensure the tabletop has some thickness
- Legs should be spaced realistically for stability""",
            "lamp": """
- Include base, pole/stand, and lampshade
- Place a `THREE.PointLight` inside the shade
- Use semi-transparent material for the shade""",
            "dresser": """
- Multiple drawers stacked vertically
- Add drawer handles or knobs
- Optionally include a top surface for decor""",
            "painting": """
- Thin frame surrounding a flat canvas
- Use a very shallow depth
- Designed to hang on a wall""",
        }
        return requirements.get(
            furniture_type.lower(),
            "Create realistic proportions and include stylistic details appropriate for this furniture type.",
        )

    @staticmethod
    def _get_material_shininess(materials: Iterable[str]) -> int:
        materials_list = [m.lower() for m in materials]
        if not materials_list:
            return 30

        shininess_map = {
            "wood": 30,
            "metal": 100,
            "plastic": 80,
            "fabric": 10,
            "leather": 60,
            "glass": 150,
            "stone": 20,
            "marble": 90,
        }
        first_material = materials_list[0]
        return shininess_map.get(first_material, 30)

    @staticmethod
    def _extract_code(response_text: str) -> str:
        """Extract JavaScript code from Claude responses that may include fences."""
        clean = response_text.strip()
        if "```" in clean:
            import re

            match = re.search(r"```(?:javascript|js)?\n?(.*?)```", clean, re.DOTALL)
            if match:
                clean = match.group(1)

        if "function createFurniture" in clean:
            return clean.strip()

        if "const group = new THREE.Group()" in clean:
            return "function createFurniture() {\n" + clean.strip() + "\n}"

        return clean.strip()

    def _get_fallback_code(self, furniture_type: str) -> str:
        fallback_generators = {
            "chair": """function createFurniture() {
  const group = new THREE.Group();

  // Seat
  const seatGeometry = new THREE.BoxGeometry(0.45, 0.05, 0.45);
  const seatMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
  const seat = new THREE.Mesh(seatGeometry, seatMaterial);
  seat.position.y = 0.45;
  group.add(seat);

  // Backrest
  const backGeometry = new THREE.BoxGeometry(0.45, 0.5, 0.05);
  const backrest = new THREE.Mesh(backGeometry, seatMaterial);
  backrest.position.set(0, 0.7, -0.2);
  group.add(backrest);

  // Legs
  const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.45);
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
  [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(x, 0.225, z);
    group.add(leg);
  });

  return group;
}""",
            "sofa": """function createFurniture() {
  const group = new THREE.Group();

  // Base cushion
  const baseGeometry = new THREE.BoxGeometry(2, 0.4, 0.8);
  const fabricMaterial = new THREE.MeshPhongMaterial({ color: 0x5C4033 });
  const base = new THREE.Mesh(baseGeometry, fabricMaterial);
  base.position.y = 0.2;
  group.add(base);

  // Backrest
  const backGeometry = new THREE.BoxGeometry(2, 0.6, 0.2);
  const backrest = new THREE.Mesh(backGeometry, fabricMaterial);
  backrest.position.set(0, 0.5, -0.3);
  group.add(backrest);

  // Armrests
  const armGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.8);
  const leftArm = new THREE.Mesh(armGeometry, fabricMaterial);
  leftArm.position.set(-0.9, 0.35, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, fabricMaterial);
  rightArm.position.set(0.9, 0.35, 0);
  group.add(rightArm);

  return group;
}""",
            "table": """function createFurniture() {
  const group = new THREE.Group();

  // Tabletop
  const topGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.8);
  const woodMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
  const top = new THREE.Mesh(topGeometry, woodMaterial);
  top.position.y = 0.75;
  group.add(top);

  // Legs
  const legGeometry = new THREE.BoxGeometry(0.05, 0.75, 0.05);
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
  [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(x, 0.375, z);
    group.add(leg);
  });

  return group;
}""",
            "lamp": """function createFurniture() {
  const group = new THREE.Group();

  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.05);
  const metalMaterial = new THREE.MeshPhongMaterial({ color: 0x2C2C2C });
  const base = new THREE.Mesh(baseGeometry, metalMaterial);
  base.position.y = 0.025;
  group.add(base);

  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
  const pole = new THREE.Mesh(poleGeometry, metalMaterial);
  pole.position.y = 0.75;
  group.add(pole);

  // Lampshade
  const shadeGeometry = new THREE.ConeGeometry(0.3, 0.4, 8, 1, true);
  const shadeMaterial = new THREE.MeshPhongMaterial({
    color: 0xFFF8DC,
    emissive: 0xFFF8DC,
    emissiveIntensity: 0.1,
  });
  const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
  shade.position.y = 1.3;
  shade.rotation.z = Math.PI;
  group.add(shade);

  // Light
  const light = new THREE.PointLight(0xFFFFAA, 0.5, 5);
  light.position.y = 1.2;
  group.add(light);

  return group;
}""",
        }

        fallback_code = fallback_generators.get(
            furniture_type.lower(),
            """function createFurniture() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  return group;
}""",
        )
        if not fallback_code.startswith("// FALLBACK_CODE"):
            fallback_code = "// FALLBACK_CODE\n" + fallback_code
        return fallback_code