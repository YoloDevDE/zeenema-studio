import {useEffect, useRef} from 'react'
import {usePlaybackStore} from '@/store/playbackStore'
import {useProjectStore} from '@/store/projectStore'

/**
 * Runs a local requestAnimationFrame loop that advances currentTime
 * while state === 'playing'. STATUS messages from the plugin act as
 * sync anchors (they correct drift), but the local loop keeps the
 * slider smooth between messages.
 */
export function usePlaybackSync() {
    const rafRef = useRef<number | null>(null)
    // Wall-clock time (performance.now) when last server sync arrived
    const syncWallTime = useRef<number>(0)
    // Game time reported by last server sync
    const syncGameTime = useRef<number>(0)
    // Whether we are currently inside a RAF update (to avoid re-entrancy)
    const inRaf = useRef(false)

    useEffect(() => {
        // Subscribe to store: whenever time changes from OUTSIDE our RAF loop
        // (i.e. from WebSocket STATUS handler), record it as a sync anchor.
        const unsub = usePlaybackStore.subscribe((state, prev) => {
            if (inRaf.current) return // ignore our own RAF updates
            if (state.currentTime !== prev.currentTime) {
                syncWallTime.current = performance.now()
                syncGameTime.current = state.currentTime
            }
        })
        return unsub
    }, [])

    useEffect(() => {
        const loop = (now: number) => {
            const {state, setTime} = usePlaybackStore.getState()
            const activeShot = useProjectStore.getState().activeShot()
            const duration = activeShot?.durationSeconds ?? 0
            const fps = activeShot?.fps ?? 30

            if (state === 'playing' && duration > 0) {
                const wallElapsed = (now - syncWallTime.current) / 1000
                const extrapolated = syncGameTime.current + wallElapsed
                const current = usePlaybackStore.getState().currentTime

                if (extrapolated >= duration) {
                    // Shot finished – stop playback locally
                    inRaf.current = true
                    const frame = fps > 0 ? Math.round(duration * fps) : 0
                    setTime(duration, frame)
                    usePlaybackStore.getState().setState('idle')
                    inRaf.current = false
                } else if (extrapolated > current || extrapolated < current - 0.5) {
                    // Only update if time moved forward (or jumped back by >0.5s = server correction)
                    const frame = fps > 0 ? Math.round(extrapolated * fps) : 0
                    inRaf.current = true
                    setTime(extrapolated, frame)
                    inRaf.current = false
                }
            }

            rafRef.current = requestAnimationFrame(loop)
        }

        rafRef.current = requestAnimationFrame(loop)
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [])
}
