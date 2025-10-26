/**
 * Furniture Search API Client
 * Handles communication with the furniture semantic search backend
 */

const FURNITURE_API_URL = process.env.NEXT_PUBLIC_FURNITURE_API_URL || 'http://localhost:8000'

export interface FurnitureItem {
  id: string
  name: string
  category: string
  model_url: string
  thumbnail_url?: string
  dimensions?: {
    width: number
    depth: number
    height: number
  }
  style_tags?: string[]
  styleTags?: string[]  // Alternative naming
  colors?: string | string[]
  materials?: string[]
  subcategory?: string
  price?: number
  description?: string
  source?: string
  similarity?: number
  generated_code?: string  // For custom items generated from images
}

export interface FurnitureSearchRequest {
  user_id?: string
  text_query?: string
  category?: 'sofa' | 'table' | 'chair' | 'lighting' | 'painting' | 'furniture'
  limit?: number
  max_price?: number
  style_tags?: string[]
}

export interface FurnitureSearchResponse {
  items: FurnitureItem[]
  count: number
  query: {
    user_id?: string
    text_query?: string
    category?: string
  }
}

/**
 * Search for furniture using semantic search
 * Combines user preferences with natural language queries
 */
export async function searchFurniture(
  request: FurnitureSearchRequest
): Promise<FurnitureSearchResponse> {
  const response = await fetch(`${FURNITURE_API_URL}/api/furniture/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to search furniture')
  }

  return response.json()
}

/**
 * Get a specific furniture item by ID
 */
export async function getFurnitureById(furnitureId: string): Promise<FurnitureItem> {
  const response = await fetch(`${FURNITURE_API_URL}/api/furniture/${furnitureId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get furniture item')
  }

  return response.json()
}

/**
 * Search furniture by category with user preferences
 */
export async function searchFurnitureByCategory(
  category: FurnitureSearchRequest['category'],
  userId?: string,
  limit: number = 10
): Promise<FurnitureItem[]> {
  const response = await searchFurniture({
    user_id: userId,
    category,
    limit,
  })
  
  return response.items
}

/**
 * Search furniture with natural language query
 */
export async function searchFurnitureByQuery(
  query: string,
  userId?: string,
  category?: FurnitureSearchRequest['category'],
  limit: number = 10
): Promise<FurnitureItem[]> {
  const response = await searchFurniture({
    user_id: userId,
    text_query: query,
    category,
    limit,
  })
  
  return response.items
}

/**
 * Search furniture combining user preferences and natural language
 */
export async function hybridFurnitureSearch(
  userId: string,
  textQuery: string,
  options?: {
    category?: FurnitureSearchRequest['category']
    limit?: number
    max_price?: number
    style_tags?: string[]
  }
): Promise<FurnitureItem[]> {
  const response = await searchFurniture({
    user_id: userId,
    text_query: textQuery,
    category: options?.category,
    limit: options?.limit || 10,
    max_price: options?.max_price,
    style_tags: options?.style_tags,
  })
  
  return response.items
}
