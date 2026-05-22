import { Plus, Download, Upload, Trash2 } from 'lucide-react'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { ConnectionBadge } from '@/components/control/ConnectionBadge'
import { useShotStore } from '@/store/shotStore'
import { useKeyframeStore } from '@/store/keyframeStore'
import type { Shot } from '@/types/protocol'

export function Header() {
  const { shots, activeId, setActiveShot, createShot, deleteShot, renameShot, importShot, exportShot } = useShotStore()
  const { setKeyframes } = useKeyframeStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const startRename = (shot: Shot) => {
    setEditingId(shot.id)
    setEditName(shot.name)
    setTimeout(() => { editInputRef.current?.select() }, 0)
  }

  const commitRename = () => {
    if (editingId && editName.trim()) renameShot(editingId, editName.trim())
    setEditingId(null)
  }

  const handleShotChange = (id: string) => {
    setActiveShot(id)
    const shot = shots.find((s) => s.id === id)
    if (shot) setKeyframes(shot.keyframes)
  }

  const handleExport = () => {
    if (!activeId) return
    const shot = exportShot(activeId)
    if (!shot) return
    const blob = new Blob([JSON.stringify(shot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${shot.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const shot = JSON.parse(ev.target?.result as string) as Shot
          importShot(shot)
        } catch {
          // invalid file
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleDelete = () => {
    if (!activeId || shots.length <= 1) return
    deleteShot(activeId)
  }

  return (
    <header className="flex items-center gap-3 px-4 h-11 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
      {/* Logo */}
      <span className="text-sm font-semibold text-[var(--color-text)] tracking-tight mr-2">
        zeenema<span className="text-[var(--color-accent)]">.</span>studio
      </span>

      {/* Shot tabs */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {shots.map((shot) => (
          <div
            key={shot.id}
            className={`relative flex items-center h-7 rounded text-xs whitespace-nowrap transition-colors ${
              shot.id === activeId
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            {editingId === shot.id ? (
              <input
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="px-2 h-full w-28 bg-transparent outline-none border-none text-xs text-[var(--color-text)]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => handleShotChange(shot.id)}
                onDoubleClick={() => startRename(shot)}
                className="px-3 h-full"
                title="Double-click to rename"
              >
                {shot.name}
              </button>
            )}
          </div>
        ))}
        <Button size="icon" variant="ghost" onClick={() => createShot()} title="New shot">
          <Plus size={13} />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={handleImport} title="Import shot">
          <Upload size={13} />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleExport} title="Export shot">
          <Download size={13} />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleDelete} disabled={shots.length <= 1} title="Delete shot">
          <Trash2 size={13} />
        </Button>
      </div>

      <ConnectionBadge />
    </header>
  )
}
