import {useEffect, useRef} from 'react'
import {useShotStore} from '@/store/shotStore'
import {useKeyframeStore} from '@/store/keyframeStore'
import type {Keyframe, Shot} from '@/types/protocol'

const api = window.zeenema

/** Loads persisted data on mount, saves on every shots/keyframes change. */
export function usePersistence() {
    const loaded = useRef(false)

    // Load once on mount
    useEffect(() => {
        if (!api) return
        api.loadData().then((data) => {
            if (!data) return
            const {shots, keyframes} = data as { shots: Shot[]; keyframes: Record<string, Keyframe[]> }
            if (shots?.length) {
                const store = useShotStore.getState()
                // Replace default shot with persisted shots
                shots.forEach((s, i) => {
                    if (i === 0) {
                        // patch the initial shot id so we don't accumulate
                        useShotStore.setState({shots: [s], activeId: s.id})
                    } else {
                        store.importShot(s)
                    }
                })
                // Restore keyframes for active shot
                const activeId = useShotStore.getState().activeId
                if (activeId && keyframes?.[activeId]) {
                    useKeyframeStore.getState().setKeyframes(keyframes[activeId])
                }
            }
            loaded.current = true
        })
    }, [])

    // Save whenever shots or keyframes change
    useEffect(() => {
        if (!api) return
        const save = () => {
            if (!loaded.current) return
            const shots = useShotStore.getState().shots
            const activeId = useShotStore.getState().activeId
            const keyframes = useKeyframeStore.getState().keyframes
            const kfMap: Record<string, Keyframe[]> = {}
            if (activeId) kfMap[activeId] = keyframes
            api!.saveData({shots, keyframes: kfMap})
        }

        const unsubShots = useShotStore.subscribe(save)
        const unsubKf = useKeyframeStore.subscribe(save)
        return () => {
            unsubShots()
            unsubKf()
        }
    }, [])
}
