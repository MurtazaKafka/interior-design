# Prompt Experiments Log

## Overview
- Capture every `gpt-image-1` prompt trial so we can reproduce, compare, and iterate quickly.
- Record the room context, the exact furniture references used, the full prompt text, and qualitative results.
- Keep entries chronological; add follow-up notes instead of editing historical outcomes so we preserve learning.

## Furniture Reference Naming
- Use stable IDs that match the product catalog: `furn_<category>_<slug>_vNN`.
  - `category`: short descriptor such as `sofa`, `rug`, `lamp`, `chair`, `table`.
  - `slug`: lowercase hyphenated nickname that mirrors the catalog entry (`lounge-84in`, `linen-drum`).
  - `vNN`: two-digit version counter (`v01`, `v02`, …) incremented whenever the reference image or metadata changes.
- Example: `furn_sofa_lounge-84in_v01`.
- Use the same IDs in Chroma metadata, prompt logs, and frontend components.

## Experiment Entry Template
```markdown
### Experiment <ID>
- Date: YYYY-MM-DD
- Room Photo: `room_<slug>_vNN`
- Furniture: [`furn_category_slug_vNN`, ...]
- Prompt:
  ```
  <full prompt text>
  ```
- Model Inputs:
  - Room image path/URL
  - Furniture image paths/URLs (in order supplied to the API)
- Outcome:
  - Summary of fidelity, lighting, placement, stylistic match
  - Notes on any mismatches or artifacts
- Next Steps:
  - Planned prompt tweaks or asset adjustments
```

## Example (leave in place, replace with real runs later)
### Experiment 000
- Date: 2025-10-26
- Room Photo: `room_demo-loft_v01`
- Furniture: [`furn_sofa_lounge-84in_v01`, `furn_rug_sisal-warm_v01`, `furn_lamp_brass-arc_v01`]
- Prompt:
  ```
  Placeholder prompt. Replace with actual text when experiments begin.
  ```
- Model Inputs:
  - Room image: `assets/rooms/demo-loft.jpg`
  - Furniture images:
    1. `assets/products/sofa_lounge-84in.png`
    2. `assets/products/rug_sisal-warm.png`
    3. `assets/products/lamp_brass-arc.png`
- Outcome:
  - TBD
- Next Steps:
  - TBD

## Furniture Product JSON Example
```json
[
  {
    "id": "furn_sofa_lounge-84in_v01",
    "name": "Lounge Sofa 84\"",
    "brand": "Everyday Studio",
    "category": "sofa",
    "roomTypes": ["living"],
    "price": 1299,
    "currency": "USD",
    "buy_url": "https://example-retailer.com/products/lounge-sofa-84",
    "image_url": "/products/sofa_lounge-84in_v01.webp",
    "dimensions_in": { "w": 84, "d": 36, "h": 32 },
    "materials": ["linen upholstery", "solid oak frame"],
    "colors": ["warm beige", "light oak"],
    "style_tags": ["modern", "scandinavian", "neutral"],
    "description": "Bench-seat sofa with down-alternative cushions and oak base.",
    "scraped_at": "2025-10-26T17:44:00Z"
  },
  {
    "id": "furn_lamp_brass-arc_v01",
    "name": "Arc Floor Lamp",
    "brand": "Illume Co.",
    "category": "lamp",
    "roomTypes": ["living", "bedroom"],
    "price": 299,
    "currency": "USD",
    "buy_url": "https://example-retailer.com/products/brass-arc-lamp",
    "image_url": "/products/lamp_brass-arc_v01.png",
    "dimensions_in": { "w": 45, "d": 15, "h": 78 },
    "materials": ["brushed brass", "linen shade"],
    "colors": ["brass", "ivory"],
    "style_tags": ["mid-century", "warm"],
    "lighting_type": "ambient",
    "description": "Oversized arc lamp with weighted marble base and diffused shade.",
    "scraped_at": "2025-10-26T17:44:00Z"
  }
]
```

