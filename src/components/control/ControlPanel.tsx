import { Play, Pause, Square, SkipBack, Camera, Plus, AlignJustify, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePlaybackStore } from '@/store/playbackStore'
import { useConnectionStore } from '@/store/connectionStore'
import { useShotStore } from '@/store/shotStore'
import { useKeyframeStore } from '@/store/keyframeStore'
import type { ClientMessage, Keyframe } from '@/types/protocol'

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
  const { activeShot, updateShotSettings } = useShotStore()
  const shot = activeShot()
  const { keyframes, upsertAndSelect, clearKeyframes } = useKeyframeStore()
  const fps = shot?.fps ?? 30
  const duration = shot?.durationSeconds ?? 0

  const disabled = status !== 'connected'
  const isPlaying = state === 'playing'
  const isPaused = state === 'paused'

  const handlePlay = () => {
    send({
      type: 'SET_SHOT',
      data: {
        keyframes,
        durationSeconds: duration,
        fps,
      },
    })
    send({ type: 'PLAY' })
  }

  const handleCaptureKeyframe = () => {
    send({ type: 'CAPTURE_KEYFRAME', data: { time: currentTime } })
  }

  const handleEvenlySplit = () => {
    if (keyframes.length < 2) return
    const sorted = [...keyframes].sort((a, b) => a.time - b.time)
    const step = duration / (sorted.length - 1)
    sorted.forEach((kf, i) => {
      const updated = { ...kf, time: parseFloat((i * step).toFixed(3)) }
      upsertAndSelect(updated)
      send({ type: 'SET_KEYFRAME', data: updated })
    })
  }

  const handleAddKeyframe = () => {
    const id = crypto.randomUUID()
    const newKf: Keyframe = {
      id,
      time: currentTime,
      pos: [0, 0, 0],
      rot: [0, 0, 0, 1],
      fov: 60,
      easing: 'linear',
    }
    upsertAndSelect(newKf)
    send({ type: 'SET_KEYFRAME', data: newKf })
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
        <Button size="icon" variant="primary" disabled={disabled} onClick={handlePlay} title="Play">
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

      {/* Duration & FPS inputs */}
      <div className="flex items-center gap-1 ml-1">
        <label className="text-[10px] text-[var(--color-text-muted)]">dur</label>
        <input
          type="number"
          min={1}
          step={useFrames ? fps : 0.1}
          value={useFrames ? Math.round(duration * fps) : parseFloat(duration.toFixed(1))}
          onChange={(e) => {
            if (!shot) return
            const raw = parseFloat(e.target.value)
            if (isNaN(raw) || raw <= 0) return
            const secs = useFrames ? raw / fps : raw
            updateShotSettings(shot.id, { durationSeconds: parseFloat(secs.toFixed(3)) })
          }}
          className="w-16 px-1 py-0.5 text-xs font-mono bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          title={useFrames ? 'Duration in frames' : 'Duration in seconds'}
        />
      </div>

      <div className="flex-1" />

      {/* Delete all keyframes */}
      <Button size="sm" variant="ghost" onClick={() => clearKeyframes()} disabled={keyframes.length === 0} title="Delete all keyframes">
        <Trash2 size={13} />
        Clear
      </Button>

      {/* Evenly split keyframes */}
      <Button size="sm" variant="ghost" onClick={handleEvenlySplit} disabled={keyframes.length < 2} title="Distribute keyframes evenly across duration">
        <AlignJustify size={13} />
        Split
      </Button>

      {/* Add keyframe manually */}
      <Button size="sm" variant="ghost" onClick={handleAddKeyframe} title="Add a keyframe at current time (no camera capture)">
        <Plus size={13} />
        Add
      </Button>

      {/* Capture keyframe */}
      <Button size="sm" variant="default" disabled={disabled} onClick={handleCaptureKeyframe} title="Capture current camera pose as keyframe">
        <Camera size={13} />
        Capture
      </Button>
    </div>
  )
}
