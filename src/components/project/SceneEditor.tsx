import {useRef, useState} from 'react'
import {Pencil, Plus, Trash2} from 'lucide-react'
import {useProjectStore} from '@/store/projectStore'
import {useKeyframeStore} from '@/store/keyframeStore'
import {Button} from '@/components/ui/Button'
import {ContextMenu} from '@/components/ui/ContextMenu'
import type {Shot} from '@/types/protocol'

// Width per second of shot duration in the timeline
const PX_PER_SEC = 14
const MIN_BLOCK_PX = 60

interface CtxState {
    shotId: string
    x: number
    y: number
}

function ShotBlock({
                       shot,
                       isActive,
                       onSelect,
                       onRename,
                       onDelete,
                       canDelete,
                       onContextMenu,
                       onRegisterRename,
                   }: {
    shot: Shot
    isActive: boolean
    onSelect: () => void
    onRename: (name: string) => void
    onDelete: () => void
    canDelete: boolean
    onContextMenu: (e: React.MouseEvent) => void
    onRegisterRename: (fn: () => void) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(shot.name)
    const inputRef = useRef<HTMLInputElement>(null)

    const width = Math.max(MIN_BLOCK_PX, shot.durationSeconds * PX_PER_SEC)

    const startEdit = () => {
        setDraft(shot.name)
        setEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
    }

    onRegisterRename(startEdit)

    const commit = () => {
        const name = draft.trim()
        if (name) onRename(name)
        setEditing(false)
    }

    return (
        <div
            onClick={onSelect}
            onDoubleClick={(e) => {
                e.stopPropagation();
                startEdit()
            }}
            onContextMenu={onContextMenu}
            title="Click to select · Right-click for options"
            className={`relative flex flex-col justify-center shrink-0 h-full rounded cursor-pointer border transition-colors group px-2 py-1.5 ${
                isActive
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
            }`}
            style={{width}}
        >
            {/* Shot name */}
            {editing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit()
                        if (e.key === 'Escape') setEditing(false)
                    }}
                    className="w-full bg-transparent outline-none border-none text-xs font-medium text-white"
                    autoFocus
                />
            ) : (
                <span className="block truncate text-xs font-medium leading-tight">{shot.name}</span>
            )}

            {/* Subtext: duration + keyframe count */}
            <span className={`block truncate text-[10px] leading-tight mt-0.5 ${isActive ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>
                {shot.durationSeconds}s · {shot.keyframes.length} kf
            </span>

            {/* Delete button – appears on hover */}
            {canDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/20"
                    title="Delete shot"
                >
                    <Trash2 size={10}/>
                </button>
            )}
        </div>
    )
}

export function SceneEditor() {
    const {
        activeShotId,
        activeScene,
        createShot,
        deleteShot,
        renameShot,
        setActiveShot,
    } = useProjectStore()
    const {setKeyframes} = useKeyframeStore()
    const [ctx, setCtx] = useState<CtxState | null>(null)
    const renameRefs = useRef<Record<string, () => void>>({})

    const scene = activeScene()
    if (!scene) {
        return (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-xs">
                No scene selected
            </div>
        )
    }

    const handleSelectShot = (shot: Shot) => {
        setActiveShot(shot.id)
        setKeyframes(shot.keyframes)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Scene label row */}
            <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--color-border)] shrink-0">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium select-none">
                    Scene:
                </span>
                <span className="text-xs font-semibold text-[var(--color-text)] select-none truncate">
                    {scene.name}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] select-none">
                    ({scene.shots.length} shot{scene.shots.length !== 1 ? 's' : ''})
                </span>
            </div>

            {/* Shot blocks row */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0">
                <div className="flex items-stretch gap-2 h-full px-3 py-2">
                    {scene.shots.map((shot) => (
                        <ShotBlock
                            key={shot.id}
                            shot={shot}
                            isActive={shot.id === activeShotId}
                            onSelect={() => handleSelectShot(shot)}
                            onRename={(name) => renameShot(shot.id, name)}
                            onDelete={() => deleteShot(shot.id)}
                            canDelete={scene.shots.length > 1}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setCtx({shotId: shot.id, x: e.clientX, y: e.clientY})
                            }}
                            onRegisterRename={(fn) => {
                                renameRefs.current[shot.id] = fn
                            }}
                        />
                    ))}

                    {/* Add shot button */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => createShot()}
                        title="Add shot"
                        className="shrink-0 self-center h-10 w-10"
                    >
                        <Plus size={14}/>
                    </Button>
                </div>
            </div>

            {/* Context menu */}
            {ctx && (
                <ContextMenu
                    x={ctx.x}
                    y={ctx.y}
                    onClose={() => setCtx(null)}
                    items={[
                        {
                            label: 'Rename',
                            icon: <Pencil size={12}/>,
                            onClick: () => renameRefs.current[ctx.shotId]?.(),
                        },
                        ...(scene.shots.length > 1 ? [{
                            label: 'Delete',
                            icon: <Trash2 size={12}/>,
                            danger: true,
                            onClick: () => deleteShot(ctx.shotId),
                        }] : []),
                    ]}
                />
            )}
        </div>
    )
}
