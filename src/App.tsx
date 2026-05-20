import { useWebSocket } from '@/hooks/useWebSocket'
import { Header } from '@/components/layout/Header'
import { KeyframeEditor } from '@/components/keyframe/KeyframeEditor'
import { Timeline } from '@/components/timeline/Timeline'
import { ControlPanel } from '@/components/control/ControlPanel'
import { PathPreview } from '@/components/preview/PathPreview'

export default function App() {
  const { send } = useWebSocket()

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      {/* Top bar */}
      <Header />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Keyframe editor */}
        <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Inspector</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <KeyframeEditor send={send} />
          </div>
        </aside>

        {/* Center — 3D preview */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <PathPreview />
          </div>
        </main>
      </div>

      {/* Bottom — Timeline + Controls */}
      <div className="shrink-0">
        <Timeline send={send} />
        <ControlPanel send={send} />
      </div>
    </div>
  )
}
