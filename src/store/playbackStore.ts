import { create } from 'zustand'
import type { PlaybackState } from '@/types/protocol'

interface PlaybackStoreState {
  state: PlaybackState
  currentTime: number
  currentFrame: number
  useFrames: boolean
  setState: (state: PlaybackState) => void
  setTime: (time: number, frame: number) => void
  toggleTimeMode: () => void
}

export const usePlaybackStore = create<PlaybackStoreState>((set) => ({
  state: 'idle',
  currentTime: 0,
  currentFrame: 0,
  useFrames: false,
  setState: (state) => set({ state }),
  setTime: (currentTime, currentFrame) => set({ currentTime, currentFrame }),
  toggleTimeMode: () => set((s) => ({ useFrames: !s.useFrames })),
}))
