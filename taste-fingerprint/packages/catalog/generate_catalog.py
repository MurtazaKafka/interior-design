#!/usr/bin/env python3
"""
Generate comprehensive furniture catalog with 130+ items.
Categories: furniture (70), lighting (30), paintings (30)
"""

import json
from typing import List, Dict, Any

def generate_furniture_catalog() -> List[Dict[str, Any]]:
    """Generate 70 furniture items across multiple subcategories."""
    catalog = []
    
    # SOFAS (10 items)
    sofas = [
        {"id": "furn_sofa_001", "name": "Oslo Modern Sectional", "style": ["modern", "minimalist"], "colors": ["gray"], "price": 1299},
        {"id": "furn_sofa_002", "name": "Copenhagen Loveseat", "style": ["scandinavian"], "colors": ["beige"], "price": 899},
        {"id": "furn_sofa_003", "name": "Mad Men Tufted Sofa", "style": ["mid-century"], "colors": ["tan", "leather