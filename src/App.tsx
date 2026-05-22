import { useRef, useState, useCallback } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePlaybackSync } from '@/hooks/usePlaybackSync'
import { Header } from '@/components/layout/Header'
import { KeyframeEditor } from '@/components/keyframe/KeyframeEditor'
import { KeyframeTable } from '@/components/keyframe/KeyframeTable'
import { Timeline } from '@/components/timeline/Timeline'
import { ControlPanel } from '@/components/control/ControlPanel'
import { PathPreview } from '@/components/preview/PathPreview'

const INSPECTOR_MIN = 160
const INSPECTOR_MAX = 480
const INSPECTOR_DEFAULT = 224

export default function App() {
  const { send } = useWebSocket()
  usePlaybackSync()

  const [showPreview, setShowPreview] = useState(true)
  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_DEFAULT)

  // ── Inspector horizontal resize ──────────────────────────────────────────
  const inspectorDragRef = useRef(false)
  const inspectorStartX = useRef(0)
  const inspectorStartW = useRef(0)

  const onInspectorDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    inspectorDragRef.current = true
    inspectorStartX.current = e.clientX
    inspectorStartW.current = inspectorWidth

    const onMove = (me: MouseEvent) => {
      if (!inspectorDragRef.current) return
      const delta = me.clientX - inspectorStartX.current
      setInspectorWidth(Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, inspectorStartW.current + delta)))
    }
    const onUp = () => {
      inspectorDragRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [inspectorWidth])


  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      {/* Top bar */}
      <Header />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Inspector */}
        <aside
          className="shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden relative"
          style={{ width: inspectorWidth }}
        >
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Inspector</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <KeyframeEditor send={send} />
          </div>

          {/* Drag handle — right edge */}
          <div
            className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]/40 transition-colors"
            onMouseDown={onInspectorDragStart}
          />
        </aside>

        {/* Center — 3D preview or expanded keyframe list */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="absolute top-2 right-2 z-20 px-2 py-1 rounded text-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
            title={showPreview ? 'Hide Preview' : 'Show Preview'}
          >
            {showPreview ? '⊟ Hide Preview' : '⊞ Show Preview'}
          </button>
          {showPreview ? (
            <div className="flex-1 relative">
              <PathPreview send={send} />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Keyframe List</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <KeyframeTable send={send} expanded />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom — DaVinci-style: Timeline + Controls */}
      <div className="shrink-0 flex flex-col border-t border-[var(--color-border)]">
        <Timeline send={send} />
        <KeyframeTable send={send} showCopyPaste />
        <ControlPanel send={send} />
      </div>
    </div>
  )
}
