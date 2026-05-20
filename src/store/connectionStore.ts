import { create } from 'zustand'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface ConnectionState {
  status: ConnectionStatus
  sceneReady: boolean
  sceneName: string | null
  lastError: string | null
  setStatus: (status: ConnectionStatus) => void
  setSceneReady: (ready: boolean, sceneName?: string | null) => void
  setError: (error: string | null) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  sceneReady: false,
  sceneName: null,
  lastError: null,
  setStatus: (status) => set({ status }),
  setSceneReady: (ready, sceneName = null) => set({ sceneReady: ready, sceneName }),
  setError: (error) => set({ lastError: error }),
}))
