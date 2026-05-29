import type {Command} from './historyStore'
import {useKeyframeStore} from './keyframeStore'
import {useShotStore} from './shotStore'
import type {Keyframe, Shot} from '@/types/protocol'

// ─── Keyframe Commands ────────────────────────────────────────────────────────

export function upsertKeyframeCommand(keyframe: Keyframe): Command {
    const prev = useKeyframeStore.getState().keyframes.find((k) => k.id === keyframe.id)
    return {
        description: prev ? 'Edit keyframe' : 'Add keyframe',
        execute: () => useKeyframeStore.getState().upsertKeyframe(keyframe),
        undo: () => {
            if (prev) {
                useKeyframeStore.getState().upsertKeyframe(prev)
            } else {
                useKeyframeStore.getState().deleteKeyframe(keyframe.id)
            }
        },
    }
}

export function upsertAndSelectCommand(keyframe: Keyframe): Command {
    const prev = useKeyframeStore.getState().keyframes.find((k) => k.id === keyframe.id)
    const prevSelectedId = useKeyframeStore.getState().selectedId
    return {
        description: prev ? 'Edit keyframe' : 'Add keyframe',
        execute: () => useKeyframeStore.getState().upsertAndSelect(keyframe),
        undo: () => {
            if (prev) {
                useKeyframeStore.getState().upsertKeyframe(prev)
            } else {
                useKeyframeStore.getState().deleteKeyframe(keyframe.id)
            }
            useKeyframeStore.getState().selectKeyframe(prevSelectedId)
        },
    }
}

export function deleteKeyframeCommand(id: string): Command {
    const prev = useKeyframeStore.getState().keyframes.find((k) => k.id === id)
    const prevSelectedId = useKeyframeStore.getState().selectedId
    return {
        description: 'Delete keyframe',
        execute: () => useKeyframeStore.getState().deleteKeyframe(id),
        undo: () => {
            if (prev) {
                useKeyframeStore.getState().upsertKeyframe(prev)
                if (prevSelectedId === id) useKeyframeStore.getState().selectKeyframe(id)
            }
        },
    }
}

export function clearKeyframesCommand(): Command {
    const prevKeyframes = [...useKeyframeStore.getState().keyframes]
    const prevSelectedId = useKeyframeStore.getState().selectedId
    return {
        description: 'Clear all keyframes',
        execute: () => useKeyframeStore.getState().clearKeyframes(),
        undo: () => {
            useKeyframeStore.getState().setKeyframes(prevKeyframes)
            useKeyframeStore.getState().selectKeyframe(prevSelectedId)
        },
    }
}

export function reorderKeyframesCommand(ids: string[]): Command {
    const prevIds = useKeyframeStore.getState().keyframes.map((k) => k.id)
    return {
        description: 'Reorder keyframes',
        execute: () => useKeyframeStore.getState().reorderKeyframes(ids),
        undo: () => useKeyframeStore.getState().reorderKeyframes(prevIds),
    }
}

export function evenlySplitKeyframesCommand(updatedKeyframes: Keyframe[]): Command {
    const prevKeyframes = useKeyframeStore.getState().keyframes.map((k) => ({...k}))
    return {
        description: 'Evenly split keyframes',
        execute: () => {
            for (const kf of updatedKeyframes) {
                useKeyframeStore.getState().upsertKeyframe(kf)
            }
        },
        undo: () => {
            useKeyframeStore.getState().setKeyframes(prevKeyframes)
        },
    }
}

// ─── Shot Commands ────────────────────────────────────────────────────────────

export function createShotCommand(name?: string): Command & { shotId: string } {
    const id = crypto.randomUUID()
    const shot: Shot = {id, name: name ?? 'New Shot', keyframes: [], durationSeconds: 10, fps: 30}
    return {
        description: 'Create shot',
        shotId: id,
        execute: () => useShotStore.getState().createShotWithId(shot),
        undo: () => useShotStore.getState().deleteShot(id),
    }
}

export function deleteShotCommand(id: string): Command {
    const prev = useShotStore.getState().shots.find((s) => s.id === id)
    const prevActiveId = useShotStore.getState().activeId
    return {
        description: 'Delete shot',
        execute: () => useShotStore.getState().deleteShot(id),
        undo: () => {
            if (prev) {
                useShotStore.getState().restoreShot(prev, prevActiveId)
            }
        },
    }
}

export function renameShotCommand(id: string, name: string): Command {
    const prev = useShotStore.getState().shots.find((s) => s.id === id)
    const prevName = prev?.name ?? ''
    return {
        description: 'Rename shot',
        execute: () => useShotStore.getState().renameShot(id, name),
        undo: () => useShotStore.getState().renameShot(id, prevName),
    }
}

export function updateShotSettingsCommand(
    id: string,
    settings: Partial<Pick<Shot, 'durationSeconds' | 'fps'>>,
): Command {
    const prev = useShotStore.getState().shots.find((s) => s.id === id)
    const prevSettings: Partial<Pick<Shot, 'durationSeconds' | 'fps'>> = {
        durationSeconds: prev?.durationSeconds,
        fps: prev?.fps,
    }
    return {
        description: 'Update shot settings',
        execute: () => useShotStore.getState().updateShotSettings(id, settings),
        undo: () => useShotStore.getState().updateShotSettings(id, prevSettings),
    }
}

export function importShotCommand(shot: Shot): Command {
    const newId = crypto.randomUUID()
    return {
        description: 'Import shot',
        execute: () => useShotStore.getState().importShotWithId({...shot, id: newId}),
        undo: () => useShotStore.getState().deleteShot(newId),
    }
}
