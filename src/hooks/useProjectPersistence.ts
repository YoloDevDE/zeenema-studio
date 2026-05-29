import {useEffect, useRef} from 'react'
import {newProject, useProjectStore} from '@/store/projectStore'
import {useKeyframeStore} from '@/store/keyframeStore'
import {useProjectLibraryStore} from '@/store/projectLibraryStore'
import type {Project} from '@/types/protocol'

const api = window.zeenema

/** Auto-loads the last project on mount, auto-saves on every change. */
export function useProjectPersistence() {
    const loaded = useRef(false)

    // Load last project on mount (from legacy data.json for backwards compat)
    useEffect(() => {
        if (!api) {
            loaded.current = true
            return
        }
        api.loadData().then((data) => {
            // Try to interpret legacy data as a project
            if (data && (data as unknown as Record<string, unknown>).scenes) {
                useProjectStore.getState().setProject(data as unknown as Project)
            }
            loaded.current = true
        })
    }, [])

    // Auto-save whenever project or keyframes change (always – localStorage + optional Electron)
    useEffect(() => {
        const save = () => {
            if (!loaded.current) return
            // Build a snapshot of the project with current keyframes injected (without mutating the store)
            const {keyframes} = useKeyframeStore.getState()
            const {activeSceneId, activeShotId, project} = useProjectStore.getState()
            let projectToSave = project
            if (activeSceneId && activeShotId) {
                projectToSave = {
                    ...project,
                    scenes: project.scenes.map((sc) =>
                        sc.id === activeSceneId
                            ? {
                                ...sc,
                                shots: sc.shots.map((sh) =>
                                    sh.id === activeShotId ? {...sh, keyframes} : sh
                                ),
                            }
                            : sc
                    ),
                }
            }
            // Always save to localStorage via projectLibraryStore
            useProjectLibraryStore.getState().saveProject(projectToSave)
            // Also save via Electron API if available
            if (api) {
                api.saveData(projectToSave as unknown as Parameters<typeof api.saveData>[0])
            }
        }
        const unsubProject = useProjectStore.subscribe(save)
        const unsubKf = useKeyframeStore.subscribe(save)
        return () => {
            unsubProject()
            unsubKf()
        }
    }, [])
}

/** Sync keyframes from keyframeStore into the active shot whenever keyframes change */
export function useShotKeyframeSync() {
    useEffect(() => {
        // When keyframes change → persist into active shot in projectStore
        const unsubKf = useKeyframeStore.subscribe((kfState) => {
            const {activeSceneId, activeShotId} = useProjectStore.getState()
            if (activeSceneId && activeShotId) {
                useProjectStore.getState().updateShotKeyframes(activeShotId, kfState.keyframes)
            }
        })

        // When active shot changes → load its keyframes into keyframeStore
        let prevShotId = useProjectStore.getState().activeShotId
        const unsubShot = useProjectStore.subscribe((state) => {
            if (state.activeShotId !== prevShotId) {
                prevShotId = state.activeShotId
                const scene = state.project.scenes.find((sc) => sc.id === state.activeSceneId)
                const shot = scene?.shots.find((sh) => sh.id === state.activeShotId)
                useKeyframeStore.getState().setKeyframes(shot?.keyframes ?? [])
            }
        })

        return () => {
            unsubKf()
            unsubShot()
        }
    }, [])
}

/** Helper to open a project via native dialog */
export async function openProjectFile(): Promise<boolean> {
    if (!api?.openProject) return false
    const data = await api.openProject()
    if (!data) return false
    useProjectStore.getState().setProject(data as Project)
    // Load keyframes for new active shot
    const {activeSceneId, activeShotId, project} = useProjectStore.getState()
    const scene = project.scenes.find((sc) => sc.id === activeSceneId)
    const shot = scene?.shots.find((sh) => sh.id === activeShotId)
    if (shot) useKeyframeStore.getState().setKeyframes(shot.keyframes)
    return true
}

/** Helper to save the current project via native dialog (Save As) */
export async function saveProjectFileAs(): Promise<boolean> {
    if (!api?.saveProjectAs) return false
    const project = useProjectStore.getState().project
    return api.saveProjectAs(project)
}

/** Helper to save the current project (uses existing path or prompts) */
export async function saveProjectFile(): Promise<boolean> {
    if (!api?.saveProject) return false
    const project = useProjectStore.getState().project
    return api.saveProject(project)
}

/** Helper to start a new project */
export function newProjectFile() {
    useProjectStore.getState().setProject(newProject())
    useKeyframeStore.getState().clearKeyframes()
    api?.newProject?.()
}
