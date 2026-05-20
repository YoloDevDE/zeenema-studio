export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier'
export type PlaybackState = 'idle' | 'playing' | 'paused'

export interface Keyframe {
  id: string
  time: number
  pos: Vec3
  rot: Quat
  fov: number
  easing: EasingType
  bezierHandles?: [number, number, number, number]
}

export interface Shot {
  id: string
  name: string
  keyframes: Keyframe[]
  durationSeconds: number
  fps: number
}

// ── Client → Plugin ──────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'ABORT' }
  | { type: 'SEEK'; data: { time: number } }
  | { type: 'SET_KEYFRAME'; data: Keyframe }
  | { type: 'DELETE_KEYFRAME'; data: { id: string } }
  | { type: 'REORDER_KEYFRAMES'; data: { ids: string[] } }
  | { type: 'CAPTURE_KEYFRAME'; data: { time: number } }
  | { type: 'GET_STATE' }
  | { type: 'SET_SHOT'; data: { keyframes: Keyframe[]; durationSeconds: number; fps: number } }

// ── Plugin → Client ──────────────────────────────────────────────────────────

export type PluginMessage =
  | { type: 'STATUS'; data: { state: PlaybackState; time: number; frame: number } }
  | { type: 'KEYFRAME_CAPTURED'; data: Keyframe }
  | { type: 'STATE_SYNC'; data: { keyframes: Keyframe[]; state: PlaybackState; time: number } }
  | { type: 'SCENE_READY'; data: { sceneName: string } }
  | { type: 'ERROR'; data: { message: string } }
