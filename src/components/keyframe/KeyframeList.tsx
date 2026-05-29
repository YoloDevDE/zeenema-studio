import {useKeyframeStore} from '@/store/keyframeStore'
import {useHistoryStore} from '@/store/historyStore'
import {deleteKeyframeCommand, upsertKeyframeCommand} from '@/store/commands'
import {EASING_LABELS} from '@/lib/easing'
import {Trash2} from 'lucide-react'
import {NumericInput} from '@/components/ui/NumericInput'
import type {ClientMessage, EasingType, Keyframe} from '@/types/protocol'

interface KeyframeListProps {
    send: (msg: ClientMessage) => void
}

export function KeyframeList({send}: KeyframeListProps) {
    const {keyframes, selectedId, selectKeyframe} = useKeyframeStore()
    const execute = useHistoryStore((s) => s.execute)

    if (keyframes.length === 0) return null

    const handleSelect = (kf: Keyframe) => {
        selectKeyframe(kf.id)
        send({type: 'SEEK', data: {time: kf.time}})
    }

    const update = (kf: Keyframe, patch: Partial<Keyframe>) => {
        const updated = {...kf, ...patch}
        execute(upsertKeyframeCommand(updated))
        send({type: 'SET_KEYFRAME', data: updated})
    }

    const handleDelete = (kf: Keyframe) => {
        execute(deleteKeyframeCommand(kf.id))
        if (selectedId === kf.id) selectKeyframe(null)
        send({type: 'DELETE_KEYFRAME', data: {id: kf.id}})
    }

    return (
        <div className="px-4 py-2 overflow-x-auto h-full">
            <table className="w-full text-xs border-collapse min-w-[600px]">
                <thead>
                <tr className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    <th className="text-left pr-2 pb-1 w-6">#</th>
                    <th className="text-left pr-2 pb-1 w-20">Time (s)</th>
                    <th className="text-left pr-2 pb-1 w-16">FOV (°)</th>
                    <th className="text-left pr-2 pb-1">Pos X</th>
                    <th className="text-left pr-2 pb-1">Pos Y</th>
                    <th className="text-left pr-2 pb-1">Pos Z</th>
                    <th className="text-left pr-2 pb-1 w-28">Easing</th>
                    <th className="w-6 pb-1"></th>
                </tr>
                </thead>
                <tbody>
                {keyframes.map((kf, idx) => {
                    const isSelected = kf.id === selectedId
                    return (
                        <tr
                            key={kf.id}
                            onClick={() => handleSelect(kf)}
                            className={`cursor-pointer transition-colors ${
                                isSelected
                                    ? 'bg-[var(--color-accent)]/15'
                                    : 'hover:bg-[var(--color-surface-2)]'
                            }`}
                        >
                            {/* Index */}
                            <td className="pr-2 py-0.5">
                  <span className={`font-mono font-bold ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
                    {idx + 1}
                  </span>
                            </td>

                            {/* Time */}
                            <td className="pr-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                                <NumericInput
                                    value={kf.time}
                                    onChange={(v) => update(kf, {time: v})}
                                    step={0.1}
                                    steps={[0.1, 1, 10]}
                                    min={0}
                                    decimals={3}
                                    className="w-full"
                                />
                            </td>

                            {/* FOV */}
                            <td className="pr-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                                <NumericInput
                                    value={kf.fov}
                                    onChange={(v) => update(kf, {fov: v})}
                                    step={1}
                                    steps={[1, 5, 10]}
                                    min={10}
                                    max={120}
                                    decimals={0}
                                    className="w-full"
                                />
                            </td>

                            {/* Pos X */}
                            <td className="pr-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                                <NumericInput
                                    value={kf.pos[0]}
                                    onChange={(v) => {
                                        const pos: [number, number, number] = [...kf.pos];
                                        pos[0] = v;
                                        update(kf, {pos})
                                    }}
                                    step={0.1}
                                    steps={[0.1, 1, 10]}
                                    decimals={2}
                                    className="w-full"
                                />
                            </td>

                            {/* Pos Y */}
                            <td className="pr-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                                <NumericInput
                                    value={kf.pos[1]}
                                    onChange={(v) => {
                                        const pos: [number, number, number] = [...kf.pos];
                                        pos[1] = v;
                                        update(kf, {pos})
                                    }}
                                    step={0.1}
                                    steps={[0.1, 1, 10]}
                                    decimals={2}
                                    className="w-full"
                                />
                            </td>

                            {/* Pos Z */}
                            <td className="pr-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                                <NumericInput
                                    value={kf.pos[2]}
                                    onChange={(v) => {
                                        const pos: [number, number, number] = [...kf.pos];
                                        pos[2] = v;
                                        update(kf, {pos})
                                    }}
                                    step={0.1}
                                    steps={[0.1, 1, 10]}
                                    decimals={2}
                                    className="w-full"
                                />
                            </td>

                            {/* Easing */}
                            <td className="pr-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                                <select
                                    value={kf.easing}
                                    onChange={(e) => update(kf, {easing: e.target.value as EasingType})}
                                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-1 py-0.5 text-xs outline-none text-[var(--color-text)] focus:border-[var(--color-accent)]"
                                >
                                    {(Object.keys(EASING_LABELS) as EasingType[]).map((type) => (
                                        <option key={type} value={type}>{EASING_LABELS[type]}</option>
                                    ))}
                                </select>
                            </td>

                            {/* Delete */}
                            <td className="py-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => handleDelete(kf)}
                                    className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Delete keyframe"
                                >
                                    <Trash2 size={11}/>
                                </button>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}
