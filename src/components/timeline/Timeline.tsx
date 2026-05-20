import { useRef, useCallback } from 'react'
import { useKeyframeStore } from '@/store/keyframeStore'
import { usePlaybackStore } from '@/store/playbackStore'
import { useShotStore } from '@/store/shotStore'
import type { ClientMessage } from '@/types/protocol'

interface TimelineProps {
  send: (msg: ClientMessage) => void
}

export function Timeline({ send }: TimelineProps) {
  const { keyframes, selectedId, selectKeyframe } = useKeyframeStore()
  const { currentTime, useFrames } = usePlaybackStore()
  const activeShot = useShotStore((s) => s.activeShot())
  const duration = activeShot?.durationSeconds ?? 10
  const fps = activeShot?.fps ?? 30
  const railRef = useRef<HTMLDivElement>(null)

  const timeToPercent = (t: number) => Math.min(100, Math.max(0, (t / duration) * 100))

  const handleRailClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!railRef.current) return
    const rect = railRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = Math.max(0, Math.min(duration, (x / rect.width) * duration))
    send({ type: 'SEEK', data: { time: t } })
  }, [duration, send])

  const handleKeyframeDrag = useCallback((id: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const rail = railRef.current
    if (!rail) return

    const onMove = (me: MouseEvent) => {
      const rect = rail.getBoundingClientRect()
      const x = me.clientX - rect.left
      const t = Math.max(0, Math.min(duration, (x / rect.width) * duration))
      const kf = useKeyframeStore.getState().keyframes.find((k) => k.id === id)
      if (!kf) return
      const updated = { ...kf, time: parseFloat(t.toFixed(3)) }
      useKeyframeStore.getState().upsertKeyframe(updated)
      send({ type: 'SET_KEYFRAME', data: updated })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, send])

  const formatLabel = (t: number) =>
    useFrames ? `F${Math.round(t * fps)}` : `${t.toFixed(1)}s`

  // Ruler ticks
  const tickCount = 10
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (i / tickCount) * duration)

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      {/* Ruler */}
      <div className="relative h-4 select-none">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${timeToPercent(t)}%` }}
          >
            <div className="w-px h-2 bg-[var(--color-border)]" />
            <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums -translate-x-1/2">
              {formatLabel(t)}
            </span>
          </div>
        ))}
      </div>

      {/* Rail */}
      <div
        ref={railRef}
        className="relative h-8 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] cursor-crosshair"
        onClick={handleRailClick}
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--color-accent)] pointer-events-none z-10"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] -translate-x-1/2 -translate-y-0.5" />
        </div>

        {/* Keyframe markers */}
        {keyframes.map((kf) => (
          <div
            key={kf.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-grab active:cursor-grabbing"
            style={{ left: `${timeToPercent(kf.time)}%` }}
            onClick={(e) => { e.stopPropagation(); selectKeyframe(kf.id) }}
            onMouseDown={(e) => handleKeyframeDrag(kf.id, e)}
          >
            <div
              className={`w-3 h-3 rotate-45 border transition-colors ${
                kf.id === selectedId
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent-hover)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Keyframe count */}
      <div className="text-[10px] text-[var(--color-text-muted)]">
        {keyframes.length} keyframe{keyframes.length !== 1 ? 's' : ''}
        {selectedId && ' · click marker to select · drag to move'}
      </div>
    </div>
  )
}
