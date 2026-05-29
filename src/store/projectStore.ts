import {create} from 'zustand'
import type {Project, Scene, Shot} from '@/types/protocol'

function newShot(name = 'Shot 1'): Shot {
    return {
        id: crypto.randomUUID(),
        name,
        keyframes: [],
        durationSeconds: 10,
        fps: 30,
    }
}

function newScene(name = 'Scene 1'): Scene {
    return {
        id: crypto.randomUUID(),
        name,
        shots: [newShot()],
    }
}

export function newProject(name = 'New Project'): Project {
    return {
        id: crypto.randomUUID(),
        name,
        scenes: [newScene()],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
}

interface ProjectStoreState {
    project: Project
    activeSceneId: string | null
    activeShotId: string | null

    // Project
    setProject: (project: Project) => void
    renameProject: (name: string) => void

    // Scenes
    activeScene: () => Scene | null
    createScene: (name?: string) => void
    deleteScene: (id: string) => void
    renameScene: (id: string, name: string) => void
    setActiveScene: (id: string) => void
    reorderScenes: (ids: string[]) => void

    // Shots within active scene
    activeShot: () => Shot | null
    createShot: (name?: string) => void
    deleteShot: (id: string) => void
    renameShot: (id: string, name: string) => void
    setActiveShot: (id: string) => void
    reorderShots: (ids: string[]) => void
    updateShotKeyframes: (shotId: string, keyframes: Shot['keyframes']) => void
    updateShotSettings: (shotId: string, settings: Partial<Pick<Shot, 'durationSeconds' | 'fps'>>) => void

    // Utility
    touch: () => void
}

const initial = newProject()
const initialSceneId = initial.scenes[0].id
const initialShotId = initial.scenes[0].shots[0].id

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
    project: initial,
    activeSceneId: initialSceneId,
    activeShotId: initialShotId,

    setProject: (project) => set({
        project,
        activeSceneId: project.scenes[0]?.id ?? null,
        activeShotId: project.scenes[0]?.shots[0]?.id ?? null,
    }),

    renameProject: (name) => set((s) => ({
        project: {...s.project, name, updatedAt: new Date().toISOString()},
    })),

    activeScene: () => {
        const {project, activeSceneId} = get()
        return project.scenes.find((sc) => sc.id === activeSceneId) ?? null
    },

    createScene: (name) => {
        const scene = newScene(name ?? `Scene ${get().project.scenes.length + 1}`)
        set((s) => ({
            project: {
                ...s.project,
                scenes: [...s.project.scenes, scene],
                updatedAt: new Date().toISOString(),
            },
            activeSceneId: scene.id,
            activeShotId: scene.shots[0]?.id ?? null,
        }))
    },

    deleteScene: (id) => set((s) => {
        const scenes = s.project.scenes.filter((sc) => sc.id !== id)
        const activeSceneId = s.activeSceneId === id ? (scenes[0]?.id ?? null) : s.activeSceneId
        const activeScene = scenes.find((sc) => sc.id === activeSceneId)
        return {
            project: {...s.project, scenes, updatedAt: new Date().toISOString()},
            activeSceneId,
            activeShotId: activeScene?.shots[0]?.id ?? null,
        }
    }),

    renameScene: (id, name) => set((s) => ({
        project: {
            ...s.project,
            scenes: s.project.scenes.map((sc) => sc.id === id ? {...sc, name} : sc),
            updatedAt: new Date().toISOString(),
        },
    })),

    setActiveScene: (id) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === id)
        return {
            activeSceneId: id,
            activeShotId: scene?.shots[0]?.id ?? null,
        }
    }),

    reorderScenes: (ids) => set((s) => {
        const map = new Map(s.project.scenes.map((sc) => [sc.id, sc]))
        const scenes = ids.map((id) => map.get(id)!).filter(Boolean)
        return {project: {...s.project, scenes, updatedAt: new Date().toISOString()}}
    }),

    activeShot: () => {
        const {activeShotId} = get()
        const scene = get().activeScene()
        return scene?.shots.find((sh) => sh.id === activeShotId) ?? null
    },

    createShot: (name) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === s.activeSceneId)
        if (!scene) return s
        const shot = newShot(name ?? `Shot ${scene.shots.length + 1}`)
        const updatedScene = {...scene, shots: [...scene.shots, shot]}
        return {
            project: {
                ...s.project,
                scenes: s.project.scenes.map((sc) => sc.id === s.activeSceneId ? updatedScene : sc),
                updatedAt: new Date().toISOString(),
            },
            activeShotId: shot.id,
        }
    }),

    deleteShot: (id) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === s.activeSceneId)
        if (!scene || scene.shots.length <= 1) return s
        const shots = scene.shots.filter((sh) => sh.id !== id)
        const activeShotId = s.activeShotId === id ? (shots[0]?.id ?? null) : s.activeShotId
        const updatedScene = {...scene, shots}
        return {
            project: {
                ...s.project,
                scenes: s.project.scenes.map((sc) => sc.id === s.activeSceneId ? updatedScene : sc),
                updatedAt: new Date().toISOString(),
            },
            activeShotId,
        }
    }),

    renameShot: (id, name) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === s.activeSceneId)
        if (!scene) return s
        const updatedScene = {...scene, shots: scene.shots.map((sh) => sh.id === id ? {...sh, name} : sh)}
        return {
            project: {
                ...s.project,
                scenes: s.project.scenes.map((sc) => sc.id === s.activeSceneId ? updatedScene : sc),
                updatedAt: new Date().toISOString(),
            },
        }
    }),

    setActiveShot: (id) => set({activeShotId: id}),

    reorderShots: (ids) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === s.activeSceneId)
        if (!scene) return s
        const map = new Map(scene.shots.map((sh) => [sh.id, sh]))
        const shots = ids.map((id) => map.get(id)!).filter(Boolean)
        const updatedScene = {...scene, shots}
        return {
            project: {
                ...s.project,
                scenes: s.project.scenes.map((sc) => sc.id === s.activeSceneId ? updatedScene : sc),
                updatedAt: new Date().toISOString(),
            },
        }
    }),

    updateShotKeyframes: (shotId, keyframes) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === s.activeSceneId)
        if (!scene) return s
        const updatedScene = {
            ...scene,
            shots: scene.shots.map((sh) => sh.id === shotId ? {...sh, keyframes} : sh),
        }
        return {
            project: {
                ...s.project,
                scenes: s.project.scenes.map((sc) => sc.id === s.activeSceneId ? updatedScene : sc),
                updatedAt: new Date().toISOString(),
            },
        }
    }),

    updateShotSettings: (shotId, settings) => set((s) => {
        const scene = s.project.scenes.find((sc) => sc.id === s.activeSceneId)
        if (!scene) return s
        const updatedScene = {
            ...scene,
            shots: scene.shots.map((sh) => sh.id === shotId ? {...sh, ...settings} : sh),
        }
        return {
            project: {
                ...s.project,
                scenes: s.project.scenes.map((sc) => sc.id === s.activeSceneId ? updatedScene : sc),
                updatedAt: new Date().toISOString(),
            },
        }
    }),

    touch: () => set((s) => ({
        project: {...s.project, updatedAt: new Date().toISOString()},
    })),
}))
