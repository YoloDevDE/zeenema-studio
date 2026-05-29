import {create} from 'zustand'

interface CameraPosEvent {
    pos: [number, number, number]
    rot: [number, number, number]
    fov: number
}

interface CameraStoreState {
    pendingCameraPos: CameraPosEvent | null
    setCameraPos: (e: CameraPosEvent) => void
    clearCameraPos: () => void
}

export const useCameraStore = create<CameraStoreState>((set) => ({
    pendingCameraPos: null,
    setCameraPos: (e) => set({pendingCameraPos: e}),
    clearCameraPos: () => set({pendingCameraPos: null}),
}))
