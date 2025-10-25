const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  museum: string;
  image_url: string;
}

export interface ArtworksResponse {
  items: Artwork[];
}

export interface TasteUpdateRequest {
  user_id: string;
  win_id: string;
  lose_id?: string;
}

export interface TasteUpdateResponse {
  ok: boolean;
  vector: number[];
}

export async function fetchArtworks(): Promise<Artwork[]> {
  const res = await fetch(`${API_BASE}/artworks/list`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load artworks: ${res.status}`);
  }
  const data: ArtworksResponse = await res.json();
  return data.items;
}

export async function postTasteUpdate(payload: TasteUpdateRequest): Promise<TasteUpdateResponse> {
  const res = await fetch(`${API_BASE}/taste/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Taste update failed: ${res.status}`);
  }
  return res.json();
}
