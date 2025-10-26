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

export interface TasteSummaryRequest {
  user_id: string;
  top_k?: number;
  vector_preview?: number;
}

export interface TasteSummaryResponse {
  user_id: string;
  model: string;
  vector_preview: number[];
  top_artworks: Array<{
    id: string;
    similarity: number | null;
  metadata: Record<string, unknown>;
  }>;
  aggregates: Record<string, string[]>;
  summary?: Record<string, string>;
  raw_summary?: string;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const lines = trimmed.split('\n');
  // Remove opening fence
  lines.shift();
  // Remove optional closing fence
  while (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) {
    lines.pop();
  }
  return lines.join('\n').trim();
}

export function coerceTasteSummary(raw?: string): Record<string, string> | null {
  if (!raw) {
    return null;
  }

  const candidate = stripCodeFence(raw);

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (value != null) {
        result[key] = String(value);
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.warn('Failed to parse Claude raw summary JSON', error);
    return null;
  }
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

export async function postTasteSummary(payload: TasteSummaryRequest): Promise<TasteSummaryResponse> {
  const res = await fetch(`${API_BASE}/taste/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Taste summarize failed: ${res.status}`);
  }
  const data: TasteSummaryResponse = await res.json();
  if (!data.summary) {
    const coerced = coerceTasteSummary(data.raw_summary);
    if (coerced) {
      return { ...data, summary: coerced };
    }
  }
  return data;
}
