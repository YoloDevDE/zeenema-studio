import {Download, FilePlus, FolderOpen, Redo2, Save, Undo2} from 'lucide-react'
import {useEffect, useRef, useState} from 'react'
import {Button} from '@/components/ui/Button'
import {ConnectionBadge} from '@/components/control/ConnectionBadge'
import {useProjectStore} from '@/store/projectStore'
import {useHistoryStore} from '@/store/historyStore'
import {newProjectFile, openProjectFile, saveProjectFile, saveProjectFileAs,} from '@/hooks/useProjectPersistence'

export function Header() {
    const {project, renameProject} = useProjectStore()
    const {undo, redo, canUndo, canRedo} = useHistoryStore()

    const [editingName, setEditingName] = useState(false)
    const [draftName, setDraftName] = useState(project.name)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Keep draft in sync when project changes externally (e.g. open file)
    useEffect(() => {
        if (!editingName) setDraftName(project.name)
    }, [project.name, editingName])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                undo()
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                redo()
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
                e.preventDefault()
                saveProjectFile()
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's' && e.shiftKey) {
                e.preventDefault()
                saveProjectFileAs()
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault()
                openProjectFile()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [undo, redo])

    const startRenameProject = () => {
        console.log('[Header] click: rename project')
        setDraftName(project.name)
        setEditingName(true)
        setTimeout(() => nameInputRef.current?.select(), 0)
    }

    const commitRenameProject = () => {
        console.log('[Header] commit rename project:', draftName.trim())
        const name = draftName.trim()
        if (name) renameProject(name)
        setEditingName(false)
    }

    return (
        <header className="flex items-center gap-3 px-4 h-11 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
            {/* Logo */}
            <span className="text-sm font-semibold text-[var(--color-text)] tracking-tight shrink-0">
                zeenema<span className="text-[var(--color-accent)]">.</span>studio
            </span>

            {/* Separator */}
            <div className="h-4 w-px bg-[var(--color-border)] shrink-0"/>

            {/* Project name */}
            <div className="flex items-center gap-1 min-w-0">
                {editingName ? (
                    <input
                        ref={nameInputRef}
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={commitRenameProject}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRenameProject()
                            if (e.key === 'Escape') setEditingName(false)
                        }}
                        className="text-sm font-medium bg-transparent outline-none border-b border-[var(--color-accent)] text-[var(--color-text)] min-w-0 w-40"
                        autoFocus
                    />
                ) : (
                    <button
                        onClick={startRenameProject}
                        className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors truncate max-w-48"
                        title="Click to rename project"
                    >
                        {project.name}
                    </button>
                )}
            </div>

            {/* File actions */}
            <div className="flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => {
                    console.log('[Header] click: new project');
                    newProjectFile()
                }} title="New project">
                    <FilePlus size={13}/>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                    console.log('[Header] click: open project');
                    openProjectFile()
                }} title="Open project (Ctrl+O)">
                    <FolderOpen size={13}/>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                    console.log('[Header] click: save project');
                    saveProjectFile()
                }} title="Save project (Ctrl+S)">
                    <Save size={13}/>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                    console.log('[Header] click: save project as');
                    saveProjectFileAs()
                }} title="Save project as (Ctrl+Shift+S)">
                    <Download size={13}/>
                </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1"/>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => {
                    console.log('[Header] click: undo');
                    undo()
                }} disabled={!canUndo} title="Undo (Ctrl+Z)">
                    <Undo2 size={13}/>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                    console.log('[Header] click: redo');
                    redo()
                }} disabled={!canRedo} title="Redo (Ctrl+Y)">
                    <Redo2 size={13}/>
                </Button>
            </div>

            <ConnectionBadge/>
        </header>
    )
}
