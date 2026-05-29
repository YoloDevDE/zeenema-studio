import {create} from 'zustand'
import type {Keyframe, Shot} from '@/types/protocol'

function newShot(name = 'New Shot'): Shot {
    return {
        id: crypto.randomUUID(),
        name,
        keyframes: [],
        durationSeconds: 10,
        fps: 30,
    }
}

interface ShotStoreState {
    shots: Shot[]
    activeId: string | null
    activeShot: () => Shot | null
    createShot: (name?: string) => void
    createShotWithId: (shot: Shot) => void
    deleteShot: (id: string) => void
    restoreShot: (shot: Shot, activeId: string | null) => void
    renameShot: (id: string, name: string) => void
    setActiveShot: (id: string) => void
    updateShotKeyframes: (id: string, keyframes: Keyframe[]) => void
    updateShotSettings: (id: string, settings: Partial<Pick<Shot, 'durationSeconds' | 'fps'>>) => void
    importShot: (shot: Shot) => void
    importShotWithId: (shot: Shot) => void
    exportShot: (id: string) => Shot | null
}

export const useShotStore = create<ShotStoreState>((set, get) => {
    const initial = newShot('Shot 1')
    return {
        shots: [initial],
        activeId: initial.id,
        activeShot: () => {
            const {shots, activeId} = get()
            return shots.find((s) => s.id === activeId) ?? null
        },
        createShot: (name) => {
            const shot = newShot(name)
            set((s) => ({shots: [...s.shots, shot], activeId: shot.id}))
        },
        createShotWithId: (shot) =>
            set((s) => ({shots: [...s.shots, shot], activeId: shot.id})),
        deleteShot: (id) =>
            set((s) => {
                const shots = s.shots.filter((sh) => sh.id !== id)
                const activeId = s.activeId === id ? (shots[0]?.id ?? null) : s.activeId
                return {shots, activeId}
            }),
        restoreShot: (shot, activeId) =>
            set((s) => ({shots: [...s.shots, shot], activeId: activeId ?? s.activeId})),
        renameShot: (id, name) =>
            set((s) => ({shots: s.shots.map((sh) => (sh.id === id ? {...sh, name} : sh))})),
        setActiveShot: (id) => set({activeId: id}),
        updateShotKeyframes: (id, keyframes) =>
            set((s) => ({shots: s.shots.map((sh) => (sh.id === id ? {...sh, keyframes} : sh))})),
        updateShotSettings: (id, settings) =>
            set((s) => ({shots: s.shots.map((sh) => (sh.id === id ? {...sh, ...settings} : sh))})),
        importShot: (shot) =>
            set((s) => ({shots: [...s.shots, {...shot, id: crypto.randomUUID()}]})),
        importShotWithId: (shot) =>
            set((s) => ({shots: [...s.shots, shot]})),
        exportShot: (id) => get().shots.find((s) => s.id === id) ?? null,
    }
})
