import { useRef, useState, useCallback } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePlaybackSync } from '@/hooks/usePlaybackSync'
import { Header } from '@/components/layout/Header'
import { KeyframeEditor } from '@/components/keyframe/KeyframeEditor'
import { Timeline } from '@/components/timeline/Timeline'
import { ControlPanel } from '@/components/control/ControlPanel'
import { PathPreview } from '@/components/preview/PathPreview'
import { KeyframeList } from '@/components/keyframe/KeyframeList'
import { ChevronDown, ChevronUp } from 'lucide-react'

const INSPECTOR_MIN = 160
const INSPECTOR_MAX = 480
const INSPECTOR_DEFAULT = 224

const KF_LIST_MIN = 60
const KF_LIST_MAX = 400
const KF_LIST_DEFAULT = 140

export default function App() {
  const { send } = useWebSocket()
  usePlaybackSync()

  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_DEFAULT)
  const [kfListHeight, setKfListHeight] = useState(KF_LIST_DEFAULT)
  const [kfListOpen, setKfListOpen] = useState(true)

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

  // ── KeyframeList vertical resize ─────────────────────────────────────────
  const kfDragRef = useRef(false)
  const kfStartY = useRef(0)
  const kfStartH = useRef(0)

  const onKfListDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    kfDragRef.current = true
    kfStartY.current = e.clientY
    kfStartH.current = kfListHeight

    const onMove = (me: MouseEvent) => {
      if (!kfDragRef.current) return
      // dragging up = bigger, down = smaller (handle is at top of panel)
      const delta = kfStartY.current - me.clientY
      setKfListHeight(Math.min(KF_LIST_MAX, Math.max(KF_LIST_MIN, kfStartH.current + delta)))
    }
    const onUp = () => {
      kfDragRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [kfListHeight])

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

        {/* Center — 3D preview */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <PathPreview />
          </div>
        </main>
      </div>

      {/* Bottom — KeyframeList (resizable + collapsible) + Timeline + Controls */}
      <div className="shrink-0 flex flex-col">
        {/* KeyframeList panel */}
        <div
          className="bg-[var(--color-surface)] border-t border-[var(--color-border)] flex flex-col overflow-hidden"
          style={{ height: kfListOpen ? kfListHeight : 'auto' }}
        >
          {/* Header row with drag handle + collapse toggle */}
          <div
            className="flex items-center justify-between px-4 py-1 border-b border-[var(--color-border)] select-none"
            style={{ cursor: kfListOpen ? 'ns-resize' : 'default' }}
            onMouseDown={kfListOpen ? onKfListDragStart : undefined}
          >
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider pointer-events-none">
              Keyframes
            </span>
            <button
              className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setKfListOpen((o) => !o)}
              title={kfListOpen ? 'Collapse' : 'Expand'}
            >
              {kfListOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          </div>

          {/* Table content */}
          {kfListOpen && (
            <div className="flex-1 overflow-auto">
              <KeyframeList send={send} />
            </div>
          )}
        </div>

        <Timeline send={send} />
        <ControlPanel send={send} />
      </div>
    </div>
  )
}
