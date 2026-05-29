import {useRef, useState} from 'react'
import {Film, Pencil, Plus, Trash2} from 'lucide-react'
import {useProjectStore} from '@/store/projectStore'
import {Button} from '@/components/ui/Button'
import {ContextMenu} from '@/components/ui/ContextMenu'
import type {Scene} from '@/types/protocol'

interface CtxState {
    sceneId: string
    x: number
    y: number
}


export function ProjectSidebar() {
    const {project, activeSceneId, setActiveScene, createScene, deleteScene, renameScene} = useProjectStore()
    const [ctx, setCtx] = useState<CtxState | null>(null)

    // refs to trigger rename from context menu
    const renameRefs = useRef<Record<string, () => void>>({})

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-3 py-1.5 border-b border-[var(--color-border)] shrink-0 flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium select-none">
                    Scenes
                </span>
                <Button size="icon" variant="ghost" onClick={() => createScene()} title="New scene" className="h-5 w-5">
                    <Plus size={11}/>
                </Button>
            </div>

            {/* Scene list */}
            <div className="flex-1 overflow-y-auto py-1 px-1">
                {project.scenes.map((scene) => {
                    // Store a startEdit callback per scene via closure trick
                    let triggerRename: () => void = () => {
                    }
                    const item = (
                        <SceneItemWithRename
                            key={scene.id}
                            scene={scene}
                            isActive={scene.id === activeSceneId}
                            onSelect={() => setActiveScene(scene.id)}
                            onRename={(name) => renameScene(scene.id, name)}
                            onDelete={() => deleteScene(scene.id)}
                            canDelete={project.scenes.length > 1}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setCtx({sceneId: scene.id, x: e.clientX, y: e.clientY})
                            }}
                            onRegisterRename={(fn) => {
                                renameRefs.current[scene.id] = fn
                            }}
                        />
                    )
                    void triggerRename
                    return item
                })}
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
                            onClick: () => {
                                renameRefs.current[ctx.sceneId]?.()
                            },
                        },
                        ...(project.scenes.length > 1 ? [{
                            label: 'Delete',
                            icon: <Trash2 size={12}/>,
                            danger: true,
                            onClick: () => deleteScene(ctx.sceneId),
                        }] : []),
                    ]}
                />
            )}
        </div>
    )
}

// Wrapper that exposes startEdit via callback
function SceneItemWithRename({
                                 scene,
                                 isActive,
                                 onSelect,
                                 onRename,
                                 onDelete,
                                 canDelete,
                                 onContextMenu,
                                 onRegisterRename,
                             }: {
    scene: Scene
    isActive: boolean
    onSelect: () => void
    onRename: (name: string) => void
    onDelete: () => void
    canDelete: boolean
    onContextMenu: (e: React.MouseEvent) => void
    onRegisterRename: (fn: () => void) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(scene.name)
    const inputRef = useRef<HTMLInputElement>(null)

    const startEdit = () => {
        setDraft(scene.name)
        setEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
    }

    // Register so context menu can trigger rename
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
            className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
            }`}
        >
            <Film size={12} className="shrink-0 opacity-60"/>

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
                    className="flex-1 min-w-0 bg-transparent outline-none border-none text-xs text-white"
                    autoFocus
                />
            ) : (
                <span className="flex-1 min-w-0 text-xs truncate">{scene.name}</span>
            )}

            <span className={`text-[10px] shrink-0 ${isActive ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>
                {scene.shots.length}
            </span>

            {canDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/20 shrink-0"
                    title="Delete scene"
                >
                    <Trash2 size={10}/>
                </button>
            )}
        </div>
    )
}
