import { Play, Pause, Square, SkipBack, Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePlaybackStore } from '@/store/playbackStore'
import { useConnectionStore } from '@/store/connectionStore'
import { useShotStore } from '@/store/shotStore'
import type { ClientMessage } from '@/types/protocol'

interface ControlPanelProps {
  send: (msg: ClientMessage) => void
}

function formatTime(seconds: number, useFrames: boolean, fps: number): string {
  if (useFrames) {
    return `F${Math.round(seconds * fps)}`
  }
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

export function ControlPanel({ send }: ControlPanelProps) {
  const { state, currentTime, useFrames, toggleTimeMode } = usePlaybackStore()
  const { status } = useConnectionStore()
  const activeShot = useShotStore((s) => s.activeShot())
  const fps = activeShot?.fps ?? 30
  const duration = activeShot?.durationSeconds ?? 0

  const disabled = status !== 'connected'
  const isPlaying = state === 'playing'
  const isPaused = state === 'paused'

  const handleCaptureKeyframe = () => {
    send({ type: 'CAPTURE_KEYFRAME', data: { time: currentTime } })
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Transport controls */}
      <Button size="icon" variant="ghost" disabled={disabled} onClick={() => send({ type: 'SEEK', data: { time: 0 } })} title="Go to start">
        <SkipBack size={14} />
      </Button>

      {isPlaying ? (
        <Button size="icon" variant="default" disabled={disabled} onClick={() => send({ type: 'PAUSE' })} title="Pause">
          <Pause size={14} />
        </Button>
      ) : (
        <Button size="icon" variant="primary" disabled={disabled} onClick={() => send({ type: 'PLAY' })} title="Play">
          <Play size={14} />
        </Button>
      )}

      <Button
        size="icon"
        variant={isPaused || isPlaying ? 'danger' : 'ghost'}
        disabled={disabled || state === 'idle'}
        onClick={() => send({ type: 'ABORT' })}
        title="Abort"
      >
        <Square size={14} />
      </Button>

      {/* Timecode */}
      <button
        onClick={toggleTimeMode}
        className="ml-2 font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors tabular-nums min-w-[80px]"
        title="Toggle frames / seconds"
      >
        {formatTime(currentTime, useFrames, fps)}
        <span className="text-[var(--color-border)] mx-1">/</span>
        {formatTime(duration, useFrames, fps)}
      </button>

      <div className="flex-1" />

      {/* Capture keyframe */}
      <Button size="sm" variant="default" disabled={disabled} onClick={handleCaptureKeyframe} title="Capture current camera pose as keyframe">
        <Camera size={13} />
        Capture
      </Button>
    </div>
  )
}
