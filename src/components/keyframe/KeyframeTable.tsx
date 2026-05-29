import {useCallback, useEffect, useRef, useState} from 'react'
import {useKeyframeStore} from '@/store/keyframeStore'
import {usePlaybackStore} from '@/store/playbackStore'
import {useProjectStore} from '@/store/projectStore'
import {EASING_LABELS} from '@/lib/easing'
import type {ClientMessage, EasingType, Keyframe} from '@/types/protocol'

interface KeyframeTableProps {
    send: (msg: ClientMessage) => void
    expanded?: boolean
    showCopyPaste?: boolean
}

const EASING_TYPES = Object.keys(EASING_LABELS) as EasingType[]
const TABLE_MIN = 80
const TABLE_MAX = 400
const TABLE_DEFAULT = 180

export function KeyframeTable({send, expanded = false, showCopyPaste = false}: KeyframeTableProps) {
    const {keyframes, selectedId, selectKeyframe, upsertKeyframe} = useKeyframeStore()
    const setTime = usePlaybackStore((s) => s.setTime)
    const activeShot = useProjectStore((s) => s.activeShot())
    const fps = activeShot?.fps ?? 30

    const [collapsed, setCollapsed] = useState(false)
    const [tableHeight, setTableHeight] = useState(TABLE_DEFAULT)
    const [clipboard, setClipboard] = useState<Keyframe | null>(null)
    const dragRef = useRef(false)
    const dragStartY = useRef(0)
    const dragStartH = useRef(0)

    // Copy selected keyframe
    const copySelected = useCallback(() => {
        const kf = keyframes.find((k) => k.id === selectedId)
        if (kf) setClipboard(kf)
    }, [keyframes, selectedId])

    // Paste: create new keyframe at current time + small offset
    const pasteKeyframe = useCallback(() => {
        if (!clipboard) return
        const currentTime = usePlaybackStore.getState().currentTime
        const newId = `kf_${Date.now()}`
        // offset by 1 second or use current playhead time
        const newTime = currentTime > 0 ? currentTime : clipboard.time + 1
        const newKf: Keyframe = {...clipboard, id: newId, time: newTime}
        upsertKeyframe(newKf)
        selectKeyframe(newId)
        send({type: 'SET_KEYFRAME', data: newKf})
    }, [clipboard, upsertKeyframe, selectKeyframe, send])

    // Keyboard shortcuts Ctrl+C / Ctrl+V
    useEffect(() => {
        if (!showCopyPaste) return
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copySelected()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                pasteKeyframe()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [showCopyPaste, copySelected, pasteKeyframe])

    const onResizeDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        dragRef.current = true
        dragStartY.current = e.clientY
        dragStartH.current = tableHeight

        const onMove = (me: MouseEvent) => {
            if (!dragRef.current) return
            const dy = dragStartY.current - me.clientY // drag up = bigger
            setTableHeight(Math.min(TABLE_MAX, Math.max(TABLE_MIN, dragStartH.current + dy)))
        }
        const onUp = () => {
            dragRef.current = false
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }, [tableHeight])

    if (keyframes.length === 0) return null

    const sorted = [...keyframes].sort((a, b) => a.time - b.time)

    const applyEasingToAll = (easing: EasingType) => {
        keyframes.forEach((kf) => {
            const updated = {...kf, easing, rotEasing: easing}
            upsertKeyframe(updated)
            send({type: 'SET_KEYFRAME', data: updated})
        })
    }

    return (
        <div className="flex flex-col border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* Resize handle — drag upward to expand */}
            {!collapsed && (
                <div
                    className="h-1 cursor-ns-resize hover:bg-[var(--color-accent)]/40 transition-colors shrink-0"
                    onMouseDown={onResizeDragStart}
                />
            )}

            {/* Header bar */}
            <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--color-border)] shrink-0">
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors select-none flex items-center gap-1"
                >
                    <span>{collapsed ? '▶' : '▼'}</span>
                    <span className="uppercase tracking-wider">Keyframes ({keyframes.length})</span>
                </button>

                {!collapsed && (
                    <>
                        <div className="w-px h-3 bg-[var(--color-border)] mx-1"/>
                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">All:</span>
                        {EASING_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => applyEasingToAll(type)}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
                            >
                                {EASING_LABELS[type]}
                            </button>
                        ))}
                        {showCopyPaste && (
                            <>
                                <div className="w-px h-3 bg-[var(--color-border)] mx-1"/>
                                <button
                                    onClick={copySelected}
                                    disabled={!selectedId}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-40"
                                    title="Copy selected keyframe (Ctrl+C)"
                                >
                                    Copy
                                </button>
                                <button
                                    onClick={pasteKeyframe}
                                    disabled={!clipboard}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-40"
                                    title="Paste keyframe at playhead (Ctrl+V)"
                                >
                                    Paste{clipboard ? ' ✓' : ''}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Table body */}
            {!collapsed && (
                <div className="overflow-y-auto" style={expanded ? {flex: 1} : {height: tableHeight}}>
                    <table className="w-full text-[11px] border-collapse">
                        <thead className="sticky top-0 bg-[var(--color-surface)] z-10">
                        <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                            <th className="text-left px-2 py-1 font-normal w-6">#</th>
                            <th className="text-right px-2 py-1 font-normal">Time</th>
                            <th className="text-right px-2 py-1 font-normal">Frame</th>
                            <th className="text-right px-2 py-1 font-normal">FOV</th>
                            <th className="text-right px-2 py-1 font-normal">Easing</th>
                        </tr>
                        </thead>
                        <tbody>
                        {sorted.map((kf, idx) => {
                            const isSelected = kf.id === selectedId
                            return (
                                <tr
                                    key={kf.id}
                                    className={`cursor-pointer border-b border-[var(--color-border)]/50 transition-colors ${
                                        isSelected
                                            ? 'bg-[var(--color-accent)]/20 text-[var(--color-text)]'
                                            : 'hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                                    }`}
                                    onClick={() => {
                                        selectKeyframe(kf.id)
                                        setTime(kf.time, Math.round(kf.time * fps))
                                        send({type: 'SEEK', data: {time: kf.time}})
                                    }}
                                >
                                    <td className="px-2 py-1 tabular-nums text-[var(--color-text-muted)]">{idx + 1}</td>
                                    <td className="px-2 py-1 tabular-nums text-right">{kf.time.toFixed(2)}s</td>
                                    <td className="px-2 py-1 tabular-nums text-right">F{Math.round(kf.time * fps)}</td>
                                    <td className="px-2 py-1 tabular-nums text-right">{kf.fov}°</td>
                                    <td className="px-2 py-1 text-right text-[var(--color-text-muted)]">
                                        {EASING_LABELS[kf.easing ?? 'linear']}
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
