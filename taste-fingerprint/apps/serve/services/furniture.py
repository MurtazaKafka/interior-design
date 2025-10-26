from __future__ import annotations

"""
Furniture search service using ChromaDB and CLIP embeddings.
Supports hybrid search: user preferences + text queries.
Uses local furniture.json catalog for reliable, fast searches.
Enhanced with Claude AI for better query understanding.
"""

import json
from typing import Any, Optional

import chromadb
import numpy as np

from .embeddings import embed_text
from .query_enhancer import enhance_furniture_query


class FurnitureSearchService:
    """Service for searching furniture using semantic embeddings."""
    
    def __init__(self, chroma_client: chromadb.CloudClient):
        self.client = chroma_client
        self.furniture_collection = chroma_client.get_or_create_collection(
            "furnitures",
            metadata={"hnsw:space": "cosine"}
        )
        self.users_collection = chroma_client.get_or_create_collection(
            "users",
            metadata={"hnsw:space": "cosine"}
        )
    
    def get_user_preference_vector(self, user_id: str) -> Optional[np.ndarray]:
        """Retrieve user's taste preference vector from ChromaDB."""
        try:
            result = self.users_collection.get(
                ids=[user_id],
                include=["embeddings"]
            )
            embeddings = result.get("embeddings", [])
            if embeddings and len(embeddings) > 0:
                return np.array(embeddings[0], dtype="float32")
        except Exception as e:
            print(f"Warning: Could not retrieve user preferences: {e}")
        return None
    
    def search(
        self,
        user_id: Optional[str] = None,
        text_query: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
        use_claude: bool = True,
        **filters
    ) -> list[dict[str, Any]]:
        """
        Hybrid semantic search for furniture.
        
        
        Returns:
            List of furniture items with metadata and similarity scores
        """
        
        # Enhanced query processing with Claude
        enhanced_query = None
        if text_query and use_claude:
            try:
                enhanced_query = enhance_furniture_query(text_query)
                print(f"Claude enhanced query: {enhanced_query}")
                
                # Override category if Claude detected one and none was provided
                if not category and enhanced_query.get("category"):
                    category = enhanced_query["category"]
                
                # Add style tags to filters
                if enhanced_query.get("style_tags") and "style_tags" not in filters:
                    filters["style_tags"] = enhanced_query["style_tags"]
                
                # Use enhanced text for embedding
                text_query = enhanced_query["enhanced_text"]
            except Exception as e:
                print(f"Claude enhancement failed, using original query: {e}")
        
        # Build query vector
        query_vector = None
        
        # 1. Get user preference vector
        if user_id:
            user_vec = self.get_user_preference_vector(user_id)
            if user_vec is not None:
                query_vector = user_vec
        
        # 2. Add text query embedding
        if text_query:
            text_vec = embed_text(text_query)
            if query_vector is not None:
                # Combine user preferences (60%) with text query (40%)
                query_vector = 0.6 * query_vector + 0.4 * text_vec
            else:
                query_vector = text_vec
        
        # 3. Normalize the query vector
        if query_vector is not None:
            norm = np.linalg.norm(query_vector)
            if norm > 0:
                query_vector = query_vector / norm
        
        # If no query vector, return random sample
        if query_vector is None:
            return self._get_random_sample(category, limit, filters)
        
        # Build ChromaDB where clause for filtering
        where_clause = self._build_where_clause(category, filters)
        
        # Perform vector search
        try:
            results = self.furniture_collection.query(
                query_embeddings=[query_vector.tolist()],
                n_results=limit * 2,  # Fetch more for filtering
                where=where_clause if where_clause else None,
                include=["metadatas", "distances"]
            )
            
            # Process results
            items = []
            ids = results.get("ids", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]
            
            for item_id, metadata, distance in zip(ids, metadatas, distances):
                # Convert cosine distance to similarity score (0-1)
                similarity = 1.0 - distance
                
                # Parse JSON fields back to lists
                if "styleTags" in metadata:
                    try:
                        metadata["styleTags"] = json.loads(metadata["styleTags"])
                    except:
                        metadata["styleTags"] = []
                
                if "colors" in metadata:
                    try:
                        metadata["colors"] = json.loads(metadata["colors"])
                    except:
                        metadata["colors"] = []
                
                item = {
                    "id": item_id,
                    "similarity_score": round(similarity, 4),
                    **metadata
                }
                items.append(item)
            
            # Return top results
            return items[:limit]
            
        except Exception as e:
            print(f"Error during furniture search: {e}")
            return []
    
    def get_furniture_by_id(self, furniture_id: str) -> Optional[dict[str, Any]]:
        """Retrieve a specific furniture item by ID."""
        try:
            result = self.furniture_collection.get(
                ids=[furniture_id],
                include=["metadatas"]
            )
            
            ids = result.get("ids", [])
            metadatas = result.get("metadatas", [])
            
            if ids and metadatas:
                metadata = metadatas[0]
                
                # Parse JSON fields
                if "styleTags" in metadata:
                    try:
                        metadata["styleTags"] = json.loads(metadata["styleTags"])
                    except:
                        metadata["styleTags"] = []
                
                if "colors" in metadata:
                    try:
                        metadata["colors"] = json.loads(metadata["colors"])
                    except:
                        metadata["colors"] = []
                
                return {
                    "id": ids[0],
                    **metadata
                }
        except Exception as e:
            print(f"Error retrieving furniture by ID: {e}")
        
        return None
    
    def _build_where_clause(
        self,
        category: Optional[str],
        filters: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        """Build ChromaDB where clause from filters."""
        where = {}
        
        if category:
            where["category"] = category
        
        # Add more filters as needed
        if "max_price" in filters and filters["max_price"]:
            where["price"] = {"$lte": filters["max_price"]}
        
        return where if where else None
    
    def _get_random_sample(
        self,
        category: Optional[str],
        limit: int,
        filters: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """Get random sample when no query vector is available."""
        try:
            where_clause = self._build_where_clause(category, filters)
            
            result = self.furniture_collection.get(
                where=where_clause if where_clause else None,
                limit=limit,
                include=["metadatas"]
            )
            
            ids = result.get("ids", [])
            metadatas = result.get("metadatas", [])
            
            items = []
            for item_id, metadata in zip(ids, metadatas):
                # Parse JSON fields
                if "styleTags" in metadata:
                    try:
                        metadata["styleTags"] = json.loads(metadata["styleTags"])
                    except:
                        metadata["styleTags"] = []
                
                if "colors" in metadata:
                    try:
                        metadata["colors"] = json.loads(metadata["colors"])
                    except:
                        metadata["colors"] = []
                
                items.append({
                    "id": item_id,
                    "similarity_score": 0.0,
                    **metadata
                })
            
            return items
            
        except Exception as e:
            print(f"Error getting random sample: {e}")
            return []


# Singleton instance for convenience
_service_instance: Optional[FurnitureSearchService] = None


def search_furniture_semantically(
    chroma_client: chromadb.CloudClient,
    user_id: Optional[str] = None,
    text_query: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 10,
    **filters
) -> list[dict[str, Any]]:
    """
    Convenience function for semantic furniture search.
    
    Example:
        results = search_furniture_semantically(
            chroma_client=client,
            user_id="user_123",
            text_query="cozy modern sofa",
            category="furniture",
            limit=5
        )
    """
    global _service_instance
    
    if _service_instance is None:
        _service_instance = FurnitureSearchService(chroma_client)
    
    return _service_instance.search(
        user_id=user_id,
        text_query=text_query,
        category=category,
        limit=limit,
        **filters
    )
