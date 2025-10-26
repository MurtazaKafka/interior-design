from __future__ import annotations

"""
Query Enhancement Service using Claude AI
Parses natural language furniture queries and extracts structured parameters
for more accurate semantic search.
"""

import os
import json
from typing import Any, Optional
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    print("Warning: ANTHROPIC_API_KEY not set. Query enhancement will be disabled.")


class QueryEnhancementService:
    """Uses Claude to parse and enhance natural language furniture queries."""
    
    def __init__(self):
        if ANTHROPIC_API_KEY:
            self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
            self.enabled = True
        else:
            self.client = None
            self.enabled = False
    
    def enhance_query(self, text_query: str) -> dict[str, Any]:
        """
        Parse natural language query and extract structured parameters.
        
        Args:
            text_query: Natural language query (e.g., "I need a modern wooden coffee table")
        
        Returns:
            Enhanced query parameters:
            {
                "enhanced_text": "modern scandinavian oak coffee table",
                "category": "furniture",
                "subcategory": "table",
                "style_tags": ["modern", "scandinavian"],
                "materials": ["wood", "oak"],
                "colors": ["natural"],
                "dimensions_hint": {"approximate_width": 48}
            }
        """
        
        if not self.enabled:
            # Fallback: return original query
            return {
                "enhanced_text": text_query,
                "category": None,
                "subcategory": None,
                "style_tags": [],
                "materials": [],
                "colors": []
            }
        
        try:
            # Prompt Claude to extract structured information
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                temperature=0,
                system="""You are a furniture search assistant. Parse user queries and extract structured information for semantic search.

Output ONLY valid JSON with these fields:
{
  "enhanced_text": "improved search query optimized for semantic search",
  "category": "furniture" | "lighting" | "painting" | null,
  "subcategory": "sofa" | "chair" | "table" | "floor lamp" | "pendant" | "chandelier" | "abstract" | "botanical" | "landscape" | null,
  "style_tags": ["modern", "mid-century", "scandinavian", "industrial", "bohemian", "contemporary", "minimalist", etc.],
  "materials": ["wood", "metal", "glass", "leather", "fabric", "rattan", etc.],
  "colors": ["white", "black", "gray", "beige", "oak", "walnut", "navy", "brass", etc.],
  "dimensions_hint": {"approximate_width": number} or null
}

Be concise. Only include fields with confident values.""",
                messages=[
                    {
                        "role": "user",
                        "content": f"Parse this furniture query: \"{text_query}\""
                    }
                ]
            )
            
            # Extract JSON from Claude's response
            response_text = response.content[0].text.strip()
            
            # Try to parse JSON
            if response_text.startswith("```json"):
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif response_text.startswith("```"):
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            enhanced = json.loads(response_text)
            
            # Ensure required fields exist
            enhanced.setdefault("enhanced_text", text_query)
            enhanced.setdefault("category", None)
            enhanced.setdefault("subcategory", None)
            enhanced.setdefault("style_tags", [])
            enhanced.setdefault("materials", [])
            enhanced.setdefault("colors", [])
            enhanced.setdefault("dimensions_hint", None)
            
            return enhanced
            
        except Exception as e:
            print(f"Error enhancing query with Claude: {e}")
            # Fallback to original query
            return {
                "enhanced_text": text_query,
                "category": None,
                "subcategory": None,
                "style_tags": [],
                "materials": [],
                "colors": []
            }
    
    def generate_search_variations(self, enhanced_query: dict[str, Any]) -> list[str]:
        """
        Generate multiple search query variations from enhanced parameters.
        This helps cast a wider semantic net.
        
        Returns:
            List of search query strings to try
        """
        variations = [enhanced_query["enhanced_text"]]
        
        # Add style + category variations
        if enhanced_query.get("style_tags") and enhanced_query.get("subcategory"):
            for style in enhanced_query["style_tags"][:2]:  # Top 2 styles
                variations.append(f"{style} {enhanced_query['subcategory']}")
        
        # Add material + category variations
        if enhanced_query.get("materials") and enhanced_query.get("subcategory"):
            for material in enhanced_query["materials"][:2]:
                variations.append(f"{material} {enhanced_query['subcategory']}")
        
        # Add color + style variations
        if enhanced_query.get("colors") and enhanced_query.get("style_tags"):
            color = enhanced_query["colors"][0]
            style = enhanced_query["style_tags"][0]
            variations.append(f"{color} {style} furniture")
        
        return variations[:4]  # Return top 4 variations


# Singleton instance
_query_enhancer: Optional[QueryEnhancementService] = None


def enhance_furniture_query(text_query: str) -> dict[str, Any]:
    """
    Convenience function to enhance a furniture query using Claude.
    
    Example:
        enhanced = enhance_furniture_query("I need a cozy modern sofa")
        # Returns:
        # {
        #     "enhanced_text": "modern contemporary sectional sofa",
        #     "category": "furniture",
        #     "subcategory": "sofa",
        #     "style_tags": ["modern", "contemporary"],
        #     "materials": ["fabric"],
        #     "colors": []
        # }
    """
    global _query_enhancer
    
    if _query_enhancer is None:
        _query_enhancer = QueryEnhancementService()
    
    return _query_enhancer.enhance_query(text_query)


def get_search_variations(enhanced_query: dict[str, Any]) -> list[str]:
    """Get multiple search variations from enhanced query."""
    global _query_enhancer
    
    if _query_enhancer is None:
        _query_enhancer = QueryEnhancementService()
    
    return _query_enhancer.generate_search_variations(enhanced_query)
