import {useCallback, useEffect, useRef} from 'react'
import type {ClientMessage, PluginMessage} from '@/types/protocol'
import {useConnectionStore} from '@/store/connectionStore'
import {usePlaybackStore} from '@/store/playbackStore'
import {useKeyframeStore} from '@/store/keyframeStore'
import {useCameraStore} from '@/store/cameraStore'
import {useLevelStore} from '@/store/levelStore'
import {useHistoryStore} from '@/store/historyStore'
import {upsertAndSelectCommand} from '@/store/commands'

const STATUS_THROTTLE_MS = 50 // max 20 updates/s for STATUS messages

const WS_URL = 'ws://localhost:7777'
const RECONNECT_DELAY = 3000

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const unmounted = useRef(false)

    const {setStatus, setSceneReady, setError} = useConnectionStore()
    const {setState: setPlaybackState, setTime} = usePlaybackStore()
    const {setKeyframes} = useKeyframeStore()
    const executeHistory = useHistoryStore((s) => s.execute)
    const {setCameraPos} = useCameraStore()
    const {setLevel} = useLevelStore()

    const send = useCallback((msg: ClientMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg))
        }
    }, [])

    const lastStatusTime = useRef(0)
    const connectRef = useRef<() => void>(() => {
    })

    const connect = useCallback(() => {
        if (unmounted.current) return
        setStatus('connecting')

        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            setStatus('connected')
            setError(null)
            send({type: 'GET_STATE'})
        }

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string) as PluginMessage
                switch (msg.type) {
                    case 'STATUS': {
                        const now = performance.now()
                        if (now - lastStatusTime.current < STATUS_THROTTLE_MS) break
                        lastStatusTime.current = now
                        setPlaybackState(msg.data.state)
                        setTime(msg.data.time, msg.data.frame)
                        break
                    }
                    case 'STATE_SYNC':
                        // Preserve local/project keyframes when plugin reports an empty list on connect.
                        // This prevents accidental wipe of the current shot in the editor.
                        {
                            const localKeyframes = useKeyframeStore.getState().keyframes
                            const incomingKeyframes = msg.data.keyframes
                            if (incomingKeyframes.length > 0 || localKeyframes.length === 0) {
                                setKeyframes(incomingKeyframes)
                            }
                        }
                        setPlaybackState(msg.data.state)
                        setTime(msg.data.time, 0)
                        break
                    case 'KEYFRAME_CAPTURED':
                        executeHistory(upsertAndSelectCommand(msg.data))
                        break
                    case 'SCENE_READY':
                        setSceneReady(true, msg.data.sceneName)
                        break
                    case 'ERROR':
                        setError(msg.data.message)
                        break
                    case 'CAMERA_POS':
                        setCameraPos({pos: msg.data.pos, rot: msg.data.rot, fov: msg.data.fov})
                        break
                    case 'LEVEL_DATA':
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setLevel(msg.data.levelName, msg.data.blox as any[])
                        break
                }
            } catch {
                // ignore malformed messages
            }
        }

        ws.onclose = () => {
            setStatus('disconnected')
            setSceneReady(false)
            if (!unmounted.current) {
                reconnectTimer.current = setTimeout(() => connectRef.current(), RECONNECT_DELAY)
            }
        }

        ws.onerror = () => {
            setError('WebSocket connection error')
            ws.close()
        }
    }, [send, setStatus, setSceneReady, setError, setPlaybackState, setTime, setKeyframes, executeHistory, setCameraPos, setLevel])

    useEffect(() => {
        connectRef.current = connect
    }, [connect])

    useEffect(() => {
        unmounted.current = false
        connectRef.current()
        return () => {
            unmounted.current = true
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
            wsRef.current?.close()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return {send}
}
