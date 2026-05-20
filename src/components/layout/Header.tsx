import { Plus, Download, Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConnectionBadge } from '@/components/control/ConnectionBadge'
import { useShotStore } from '@/store/shotStore'
import { useKeyframeStore } from '@/store/keyframeStore'
import type { Shot } from '@/types/protocol'

export function Header() {
  const { shots, activeId, setActiveShot, createShot, deleteShot, importShot, exportShot } = useShotStore()
  const { setKeyframes } = useKeyframeStore()

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
          <button
            key={shot.id}
            onClick={() => handleShotChange(shot.id)}
            className={`px-3 h-7 rounded text-xs whitespace-nowrap transition-colors ${
              shot.id === activeId
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            {shot.name}
          </button>
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
