/**
 * Taste Fingerprint API Client
 * Handles communication with the artwork comparison backend
 */

const TASTE_API_URL = process.env.NEXT_PUBLIC_TASTE_API_URL || 'http://localhost:8000'

export interface Artwork {
  id: string
  title: string
  artist: string
  museum: string
  image_url: string
}

export interface ArtworksResponse {
  items: Artwork[]
}

export interface TasteUpdateRequest {
  user_id: string
  win_id: string
  lose_id?: string
}

export interface TasteUpdateResponse {
  ok: boolean
  vector: number[]
}

/**
 * Fetch all available artworks for comparison
 */
export async function fetchArtworks(): Promise<Artwork[]> {
  const response = await fetch(`${TASTE_API_URL}/artworks/list`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to load artworks: ${response.status}`)
  }

  const data: ArtworksResponse = await response.json()
  return data.items
}

/**
 * Update user's taste vector based on artwork preference
 */
export async function postTasteUpdate(payload: TasteUpdateRequest): Promise<TasteUpdateResponse> {
  const response = await fetch(`${TASTE_API_URL}/taste/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Taste update failed: ${response.status}`)
  }

  return response.json()
}
