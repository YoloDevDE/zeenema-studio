import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NumericInput } from '@/components/ui/NumericInput'
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
            <NumericInput
              value={value[i]}
              onChange={(v) => {
                const next = [...value] as [number, number, number]
                next[i] = v
                onChange(next)
              }}
              step={0.1}
              steps={[0.1, 1, 10]}
              decimals={3}
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
        <NumericInput
          value={kf.time}
          onChange={(v) => update({ time: v })}
          step={0.1}
          steps={[0.1, 1, 10]}
          min={0}
          decimals={3}
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
              <NumericInput
                value={kf.rot[i]}
                onChange={(v) => {
                  const next = [...kf.rot] as [number, number, number, number]
                  next[i] = v
                  update({ rot: next })
                }}
                step={0.001}
                steps={[0.001, 0.01, 0.1]}
                decimals={4}
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

      {/* Easing (Position) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Easing (Position)</span>
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

      {/* Easing (Rotation) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Easing (Rotation)</span>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(EASING_LABELS) as EasingType[]).map((type) => (
            <button
              key={type}
              onClick={() => update({ rotEasing: type })}
              className={`h-7 rounded text-xs transition-colors ${
                (kf.rotEasing ?? 'linear') === type
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
