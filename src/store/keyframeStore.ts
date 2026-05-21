import { create } from 'zustand'
import type { Keyframe } from '@/types/protocol'

interface KeyframeStoreState {
  keyframes: Keyframe[]
  selectedId: string | null
  lastCapturedId: string | null
  setKeyframes: (keyframes: Keyframe[]) => void
  upsertKeyframe: (keyframe: Keyframe) => void
  upsertAndSelect: (keyframe: Keyframe) => void
  deleteKeyframe: (id: string) => void
  selectKeyframe: (id: string | null) => void
  clearKeyframes: () => void
  reorderKeyframes: (ids: string[]) => void
}

export const useKeyframeStore = create<KeyframeStoreState>((set) => ({
  keyframes: [],
  selectedId: null,
  lastCapturedId: null,
  setKeyframes: (keyframes) => set({ keyframes: [...keyframes].sort((a, b) => a.time - b.time) }),
  upsertKeyframe: (keyframe) =>
    set((s) => {
      const existing = s.keyframes.findIndex((k) => k.id === keyframe.id)
      const updated = existing >= 0
        ? s.keyframes.map((k) => (k.id === keyframe.id ? keyframe : k))
        : [...s.keyframes, keyframe]
      return { keyframes: updated.sort((a, b) => a.time - b.time) }
    }),
  upsertAndSelect: (keyframe) =>
    set((s) => {
      const existing = s.keyframes.findIndex((k) => k.id === keyframe.id)
      const updated = existing >= 0
        ? s.keyframes.map((k) => (k.id === keyframe.id ? keyframe : k))
        : [...s.keyframes, keyframe]
      return { keyframes: updated.sort((a, b) => a.time - b.time), selectedId: keyframe.id, lastCapturedId: keyframe.id }
    }),
  clearKeyframes: () => set({ keyframes: [], selectedId: null, lastCapturedId: null }),
  deleteKeyframe: (id) =>
    set((s) => ({
      keyframes: s.keyframes.filter((k) => k.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectKeyframe: (id) => set({ selectedId: id }),
  reorderKeyframes: (ids) =>
    set((s) => {
      const map = new Map(s.keyframes.map((k) => [k.id, k]))
      return { keyframes: ids.map((id) => map.get(id)!).filter(Boolean) }
    }),
}))
