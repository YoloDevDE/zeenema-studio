import { useEffect, useRef, useCallback } from 'react'
import type { ClientMessage, PluginMessage } from '@/types/protocol'
import { useConnectionStore } from '@/store/connectionStore'
import { usePlaybackStore } from '@/store/playbackStore'
import { useKeyframeStore } from '@/store/keyframeStore'

const WS_URL = 'ws://localhost:7777'
const RECONNECT_DELAY = 3000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)

  const { setStatus, setSceneReady, setError } = useConnectionStore()
  const { setState: setPlaybackState, setTime } = usePlaybackStore()
  const { setKeyframes, upsertKeyframe } = useKeyframeStore()

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const connect = useCallback(() => {
    if (unmounted.current) return
    setStatus('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      setError(null)
      send({ type: 'GET_STATE' })
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as PluginMessage
        switch (msg.type) {
          case 'STATUS':
            setPlaybackState(msg.data.state)
            setTime(msg.data.time, msg.data.frame)
            break
          case 'STATE_SYNC':
            setKeyframes(msg.data.keyframes)
            setPlaybackState(msg.data.state)
            setTime(msg.data.time, 0)
            break
          case 'KEYFRAME_CAPTURED':
            upsertKeyframe(msg.data)
            break
          case 'SCENE_READY':
            setSceneReady(true, msg.data.sceneName)
            break
          case 'ERROR':
            setError(msg.data.message)
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
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
      ws.close()
    }
  }, [send, setStatus, setSceneReady, setError, setPlaybackState, setTime, setKeyframes, upsertKeyframe])

  useEffect(() => {
    unmounted.current = false
    connect()
    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { send }
}
