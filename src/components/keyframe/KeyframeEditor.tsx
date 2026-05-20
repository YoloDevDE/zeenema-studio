import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useKeyframeStore } from '@/store/keyframeStore'
import { EASING_LABELS } from '@/lib/easing'
import type { ClientMessage, EasingType, Keyframe } from '@/types/protocol'

interface KeyframeEditorProps {
  send: (msg: ClientMessage) => void
}

function Vec3Field({ label, value, onChange }: {
  label: string
  value: [number, number, number]
  onChange: (v: [number, number, number]) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
      <div className="grid grid-cols-3 gap-1">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis} className="flex flex-col gap-0.5">
            <span className="text-[9px] text-[var(--color-text-muted)] text-center">{axis}</span>
            <Input
              type="number"
              step="0.01"
              value={value[i].toFixed(3)}
              onChange={(e) => {
                const next = [...value] as [number, number, number]
                next[i] = parseFloat(e.target.value) || 0
                onChange(next)
              }}
              className="text-center text-xs px-1"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function KeyframeEditor({ send }: KeyframeEditorProps) {
  const { keyframes, selectedId, selectKeyframe, upsertKeyframe, deleteKeyframe } = useKeyframeStore()
  const kf = keyframes.find((k) => k.id === selectedId)

  if (!kf) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-xs gap-2 p-4">
        <span>No keyframe selected</span>
        <span className="text-[10px] text-center">Click a marker on the timeline or capture a new keyframe</span>
      </div>
    )
  }

  const update = (patch: Partial<Keyframe>) => {
    const updated = { ...kf, ...patch }
    upsertKeyframe(updated)
    send({ type: 'SET_KEYFRAME', data: updated })
  }

  const handleDelete = () => {
    deleteKeyframe(kf.id)
    selectKeyframe(null)
    send({ type: 'DELETE_KEYFRAME', data: { id: kf.id } })
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text)]">Keyframe</span>
        <Button size="icon" variant="ghost" onClick={handleDelete} title="Delete keyframe">
          <Trash2 size={13} />
        </Button>
      </div>

      {/* Time */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Time (s)</span>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={kf.time.toFixed(3)}
          onChange={(e) => update({ time: parseFloat(e.target.value) || 0 })}
          className="text-xs"
        />
      </div>

      {/* Position */}
      <Vec3Field label="Position" value={kf.pos} onChange={(pos) => update({ pos })} />

      {/* Rotation (Euler display, stored as Quat) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Rotation (quaternion)</span>
        <div className="grid grid-cols-4 gap-1">
          {(['X', 'Y', 'Z', 'W'] as const).map((axis, i) => (
            <div key={axis} className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[var(--color-text-muted)] text-center">{axis}</span>
              <Input
                type="number"
                step="0.001"
                value={kf.rot[i].toFixed(4)}
                onChange={(e) => {
                  const next = [...kf.rot] as [number, number, number, number]
                  next[i] = parseFloat(e.target.value) || 0
                  update({ rot: next })
                }}
                className="text-center text-xs px-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* FOV */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">FOV (°)</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="10"
            max="120"
            step="1"
            value={kf.fov}
            onChange={(e) => update({ fov: parseInt(e.target.value) })}
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span className="text-xs tabular-nums text-[var(--color-text)] w-8 text-right">{kf.fov}°</span>
        </div>
      </div>

      {/* Easing */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Easing</span>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(EASING_LABELS) as EasingType[]).map((type) => (
            <button
              key={type}
              onClick={() => update({ easing: type })}
              className={`h-7 rounded text-xs transition-colors ${
                kf.easing === type
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
              }`}
            >
              {EASING_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
