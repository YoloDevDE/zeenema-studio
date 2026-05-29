import {useEffect, useState} from 'react'
import type {ProjectMeta} from '@/store/projectLibraryStore'
import {useProjectLibraryStore} from '@/store/projectLibraryStore'
import {useProjectStore} from '@/store/projectStore'
import {useKeyframeStore} from '@/store/keyframeStore'
import {Film, FolderOpen, Plus, Trash2} from 'lucide-react'

function formatDate(iso: string) {
    try {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso))
    } catch {
        return iso
    }
}

function NewProjectCard({onCreate}: { onCreate: (name: string) => void }) {
    const [creating, setCreating] = useState(false)
    const [name, setName] = useState('')

    function handleSubmit() {
        const trimmed = name.trim()
        if (!trimmed) return
        onCreate(trimmed)
        setName('')
        setCreating(false)
    }

    function handleCancel() {
        setCreating(false)
        setName('')
    }

    if (creating) {
        return (
            <div
                className="flex flex-col gap-3 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface-2)] p-5 min-h-[160px]">
                <input
                    autoFocus
                    className="w-full rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors"
                    placeholder="Project name…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit()
                        if (e.key === 'Escape') handleCancel()
                    }}
                />
                <div className="flex gap-2 mt-auto">
                    <button
                        className="flex-1 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium py-2 transition-colors"
                        onClick={handleSubmit}
                    >
                        Create
                    </button>
                    <button
                        className="flex-1 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] text-sm py-2 transition-colors"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    return (
        <button
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all min-h-[160px] cursor-pointer group"
            onClick={() => setCreating(true)}
        >
            <div
                className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24}/>
            </div>
            <span className="text-sm font-medium">New Project</span>
        </button>
    )
}

function ProjectCard({meta, onOpen, onDelete}: {
    meta: ProjectMeta
    onOpen: (id: string) => void
    onDelete: (id: string) => void
}) {
    const [confirmDelete, setConfirmDelete] = useState(false)

    return (
        <div
            className="relative flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)] transition-all cursor-pointer group p-5 min-h-[160px]"
            onClick={() => !confirmDelete && onOpen(meta.id)}
        >
            {/* Icon */}
            <div
                className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
                <Film size={20}/>
            </div>

            {/* Name + meta */}
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{meta.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Modified: {formatDate(meta.updatedAt)}
                </p>
                {meta.savePath && (
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" title={meta.savePath}>
                        {meta.savePath}
                    </p>
                )}
            </div>

            {/* Delete button */}
            {!confirmDelete ? (
                <button
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all"
                    onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(true)
                    }}
                    title="Delete project"
                >
                    <Trash2 size={14}/>
                </button>
            ) : (
                <div
                    className="absolute inset-0 rounded-xl bg-[var(--color-surface-2)] flex flex-col items-center justify-center gap-3 p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-sm text-[var(--color-text)] text-center">Delete project?</p>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)] hover:bg-red-500 text-white text-xs font-medium transition-colors"
                            onClick={() => onDelete(meta.id)}
                        >
                            Delete
                        </button>
                        <button
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] text-xs transition-colors"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export function ProjectOverview() {
    const {projects, loadLibrary, createProject, openProject, deleteProject, loadProject} = useProjectLibraryStore()

    useEffect(() => {
        loadLibrary()
    }, [loadLibrary])

    function handleOpen(id: string) {
        const project = loadProject(id)
        if (!project) return
        useProjectStore.getState().setProject(project)
        const {activeSceneId, activeShotId, project: p} = useProjectStore.getState()
        const scene = p.scenes.find((sc) => sc.id === activeSceneId)
        const shot = scene?.shots.find((sh) => sh.id === activeShotId)
        if (shot) useKeyframeStore.getState().setKeyframes(shot.keyframes)
        openProject(id)
    }

    async function handleCreate(name: string) {
        const project = createProject(name)
        useProjectStore.getState().setProject(project)
        useKeyframeStore.getState().clearKeyframes()
        // Auto-save to %APPDATA%\.zeenema\projects
        const dir = await window.zeenema?.getDefaultProjectsDir()
        if (dir) {
            await window.zeenema?.saveProjectToDir(project, dir, project.name)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-8 py-5 border-b border-[var(--color-border)] shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
                    <Film size={16} className="text-white"/>
                </div>
                <h1 className="text-lg font-bold tracking-tight">Zeenema Studio</h1>
                <span className="ml-auto text-xs text-[var(--color-text-muted)]">Projects</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="max-w-5xl mx-auto">

                    {/* Section title */}
                    <div className="flex items-center gap-2 mb-6">
                        <FolderOpen size={16} className="text-[var(--color-text-muted)]"/>
                        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                            Projects
                        </h2>
                        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                        </span>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <NewProjectCard onCreate={handleCreate}/>
                        {projects.map((meta) => (
                            <ProjectCard
                                key={meta.id}
                                meta={meta}
                                onOpen={handleOpen}
                                onDelete={deleteProject}
                            />
                        ))}
                    </div>

                    {projects.length === 0 && (
                        <p className="text-center text-[var(--color-text-muted)] text-sm mt-12">
                            No projects yet. Create your first project!
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
