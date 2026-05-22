import { useRef, useCallback, useMemo, memo } from 'react'
import { useKeyframeStore } from '@/store/keyframeStore'
import { usePlaybackStore } from '@/store/playbackStore'
import { useShotStore } from '@/store/shotStore'
import type { ClientMessage, Keyframe } from '@/types/protocol'

interface TimelineProps {
  send: (msg: ClientMessage) => void
}

// ── Memoized Playhead ────────────────────────────────────────────────────────
const Playhead = memo(function Playhead({ percent, onMouseDown }: { percent: number; onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-[var(--color-accent)] z-10 cursor-ew-resize"
      style={{ left: `${percent}%` }}
      onMouseDown={onMouseDown}
    >
      <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] -translate-x-1/2 -translate-y-0.5" />
    </div>
  )
})

// ── Memoized Keyframe Marker ──────────────────────────────────────────────────
const KfMarker = memo(function KfMarker({
  kf, idx, isSelected, percent, onSelect, onDragStart,
}: {
  kf: Keyframe; idx: number; isSelected: boolean; percent: number
  onSelect: (id: string, time: number) => void
  onDragStart: (id: string, e: React.MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-grab active:cursor-grabbing flex flex-col items-center"
      style={{ left: `${percent}%` }}
      onClick={(e) => { e.stopPropagation(); onSelect(kf.id, kf.time) }}
      onMouseDown={(e) => onDragStart(kf.id, e)}
    >
      <span className="text-[9px] font-mono text-[var(--color-text-muted)] -mt-4 select-none">{idx + 1}</span>
      <div className={`w-3 h-3 rotate-45 border transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent)] border-[var(--color-accent-hover)]'
          : 'bg-[var(--color-surface)] border-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
      }`} />
    </div>
  )
})

export function Timeline({ send }: TimelineProps) {
  const { keyframes, selectedId, selectKeyframe } = useKeyframeStore()
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const useFrames = usePlaybackStore((s) => s.useFrames)
  const setTime = usePlaybackStore((s) => s.setTime)
  const activeShot = useShotStore((s) => s.activeShot())
  const duration = activeShot?.durationSeconds ?? 10
  const fps = activeShot?.fps ?? 30
  const railRef = useRef<HTMLDivElement>(null)

  const timeToPercent = useCallback((t: number) => Math.min(100, Math.max(0, (t / duration) * 100)), [duration])

  const isDraggingPlayhead = useRef(false)

  const handleRailClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingPlayhead.current) return
    if (!railRef.current) return
    const rect = railRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = Math.max(0, Math.min(duration, (x / rect.width) * duration))
    setTime(t, 0)
    send({ type: 'SEEK', data: { time: t } })
  }, [duration, send, setTime])

  const handlePlayheadDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const rail = railRef.current
    if (!rail) return
    isDraggingPlayhead.current = true

    const onMove = (me: MouseEvent) => {
      const rect = rail.getBoundingClientRect()
      const x = me.clientX - rect.left
      const t = Math.max(0, Math.min(duration, (x / rect.width) * duration))
      setTime(t, 0)
      send({ type: 'SEEK', data: { time: t } })
    }

    const onUp = () => {
      isDraggingPlayhead.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, send, setTime])

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

  const handleSelect = useCallback((id: string, time: number) => {
    selectKeyframe(id)
    send({ type: 'SEEK', data: { time } })
  }, [selectKeyframe, send])

  const formatLabel = (t: number) =>
    useFrames ? `F${Math.round(t * fps)}` : `${t.toFixed(1)}s`

  // Ruler ticks
  const tickCount = 10
  const ticks = useMemo(() => Array.from({ length: tickCount + 1 }, (_, i) => (i / tickCount) * duration), [duration])

  // Pre-compute percents for KF markers (avoid recalc on playhead move)
  const kfPercents = useMemo(() => keyframes.map((kf) => timeToPercent(kf.time)), [keyframes, timeToPercent])
  const playheadPercent = timeToPercent(currentTime)

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
        <Playhead percent={playheadPercent} onMouseDown={handlePlayheadDrag} />

        {/* Keyframe markers */}
        {keyframes.map((kf, idx) => (
          <KfMarker
            key={kf.id}
            kf={kf}
            idx={idx}
            isSelected={kf.id === selectedId}
            percent={kfPercents[idx]}
            onSelect={handleSelect}
            onDragStart={handleKeyframeDrag}
          />
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
