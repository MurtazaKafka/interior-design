/**
 * NeRF API Client
 * Handles all communication with the Flask NeRF API backend
 */

const API_URL = process.env.NEXT_PUBLIC_NERF_API_URL || 'http://localhost:5000'

export interface UploadImagesResponse {
  session_id: string
  uploaded_count: number
  files: string[]
}

export interface StartTrainingResponse {
  job_id: string
  session_id: string
  status: string
}

export interface TrainingStatus {
  status: 'running' | 'completed' | 'failed'
  session_id: string
  start_time: number
  progress: number
  end_time?: number
  error?: string
}

export interface Session {
  session_id: string
  created: number
}

export interface SessionsResponse {
  sessions: Session[]
}

/**
 * Upload multiple images for NeRF training
 */
export async function uploadImages(files: File[]): Promise<UploadImagesResponse> {
  const formData = new FormData()
  
  files.forEach(file => {
    formData.append('images', file)
  })

  const response = await fetch(`${API_URL}/api/upload-images`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload images')
  }

  return response.json()
}

/**
 * Start NeRF training on uploaded images
 */
export async function startTraining(sessionId: string, config: Record<string, unknown> = {}): Promise<StartTrainingResponse> {
  const response = await fetch(`${API_URL}/api/train`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      config,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start training')
  }

  return response.json()
}

/**
 * Check the status of a training job
 */
export async function getTrainingStatus(jobId: string): Promise<TrainingStatus> {
  const response = await fetch(`${API_URL}/api/training-status/${jobId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get training status')
  }

  return response.json()
}

/**
 * Get the URL for a rendered image
 */
export function getRenderedImageUrl(sessionId: string, filename: string): string {
  return `${API_URL}/api/get-render/${sessionId}/${filename}`
}

/**
 * List all available sessions
 */
export async function listSessions(): Promise<SessionsResponse> {
  const response = await fetch(`${API_URL}/api/sessions`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list sessions')
  }

  return response.json()
}

/**
 * Check if the API server is healthy
 */
export async function healthCheck(): Promise<{ status: string; service: string; version: string }> {
  const response = await fetch(`${API_URL}/health`)

  if (!response.ok) {
    throw new Error('API server is not responding')
  }

  return response.json()
}

/**
 * Get the URL for downloading the 3D mesh (.obj file)
 */
export function getMeshDownloadUrl(sessionId: string): string {
  return `${API_URL}/api/mesh/${sessionId}`
}

/**
 * Get the URL for a rendered frame image
 */
export function getRenderFrameUrl(sessionId: string, frameName: string): string {
  return `${API_URL}/api/render/${sessionId}/${frameName}`
}

/**
 * List all rendered frames for a session
 */
export async function listRenderFrames(sessionId: string): Promise<{ session_id: string; frames: string[]; count: number }> {
  const response = await fetch(`${API_URL}/api/renders/${sessionId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list render frames')
  }

  return response.json()
}
