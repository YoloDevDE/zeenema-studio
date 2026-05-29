import {useCallback, useState} from 'react'
import {useWebSocket} from '@/hooks/useWebSocket'
import {usePlaybackSync} from '@/hooks/usePlaybackSync'
import {useProjectPersistence, useShotKeyframeSync} from '@/hooks/useProjectPersistence'
import {useResize} from '@/hooks/useResize'
import {KeyframeEditor} from '@/components/keyframe/KeyframeEditor'
import {KeyframeTable} from '@/components/keyframe/KeyframeTable'
import {Timeline} from '@/components/timeline/Timeline'
import {ControlPanel} from '@/components/control/ControlPanel'
import {ProjectSidebar} from '@/components/project/ProjectSidebar'
import {SceneEditor} from '@/components/project/SceneEditor'
import {ProjectOverview} from '@/components/project/ProjectOverview'
import {useProjectLibraryStore} from '@/store/projectLibraryStore'
import {useConnectionStore} from '@/store/connectionStore'
import {useProjectStore} from '@/store/projectStore'
import {Home, Save, SaveAll} from 'lucide-react'

// ── Layout defaults & constraints ────────────────────────────────────────────
const SIDEBAR_DEFAULT = 160
const SIDEBAR_MIN = 100
const SIDEBAR_MAX = 280

const INSPECTOR_DEFAULT = 240
const INSPECTOR_MIN = 160
const INSPECTOR_MAX = 520

const BOTTOM_DEFAULT = 260   // height of SceneEditor + ControlPanel + Timeline
const BOTTOM_MIN = 160
const BOTTOM_MAX = 520

const SCENE_EDITOR_HEIGHT = 96  // fixed height for the scene editor strip

// ── Drag Handle primitives ────────────────────────────────────────────────────
function VHandle({onMouseDown}: { onMouseDown: (e: React.MouseEvent) => void }) {
    return (
        <div
            className="w-1 shrink-0 cursor-col-resize bg-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors z-10"
            onMouseDown={onMouseDown}
        />
    )
}

function HHandle({onMouseDown}: { onMouseDown: (e: React.MouseEvent) => void }) {
    return (
        <div
            className="h-1 shrink-0 cursor-row-resize bg-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors z-10"
            onMouseDown={onMouseDown}
        />
    )
}

// ── Panel label ───────────────────────────────────────────────────────────────
function PanelLabel({children}: { children: React.ReactNode }) {
    return (
        <div className="px-3 py-1.5 border-b border-[var(--color-border)] shrink-0">
      <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium select-none">
        {children}
      </span>
        </div>
    )
}

// ── Editor Layout ─────────────────────────────────────────────────────────────
function EditorLayout() {
    const {send} = useWebSocket()
    const closeProject = useProjectLibraryStore((s) => s.closeProject)
    const projectName = useProjectStore((s) => s.project.name)
    const connStatus = useConnectionStore((s) => s.status)
    const sceneName = useConnectionStore((s) => s.sceneName)

    async function handleSave() {
        const data = useProjectStore.getState().project
        await window.zeenema?.saveProject(data)
    }

    async function handleSaveAs() {
        const data = useProjectStore.getState().project
        await window.zeenema?.saveProjectAs(data)
    }

    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
    const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_DEFAULT)
    const [bottomHeight, setBottomHeight] = useState(BOTTOM_DEFAULT)

    // Horizontal: Sidebar ↔ main area
    const onSidebarDrag = useResize({
        direction: 'horizontal',
        min: SIDEBAR_MIN,
        max: SIDEBAR_MAX,
        initial: SIDEBAR_DEFAULT,
        onResize: setSidebarWidth,
    })

    // Horizontal: Inspector ↔ Keyframe Table
    const onInspectorDrag = useResize({
        direction: 'horizontal',
        min: INSPECTOR_MIN,
        max: INSPECTOR_MAX,
        initial: INSPECTOR_DEFAULT,
        onResize: setInspectorWidth,
    })

    // Vertical: main area ↔ bottom (drag up = bigger bottom)
    const onBottomDrag = useResize({
        direction: 'vertical',
        min: BOTTOM_MIN,
        max: BOTTOM_MAX,
        initial: BOTTOM_DEFAULT,
        onResize: setBottomHeight,
        invert: true,
    })

    const handleSidebarMouseDown = useCallback(
        (e: React.MouseEvent) => onSidebarDrag(e, sidebarWidth),
        [onSidebarDrag, sidebarWidth],
    )
    const handleInspectorMouseDown = useCallback(
        (e: React.MouseEvent) => onInspectorDrag(e, inspectorWidth),
        [onInspectorDrag, inspectorWidth],
    )
    const handleBottomMouseDown = useCallback(
        (e: React.MouseEvent) => onBottomDrag(e, bottomHeight),
        [onBottomDrag, bottomHeight],
    )

    return (
        <div className="flex flex-col h-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden select-none">

            {/* ── Slim title bar with Home button ── */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
                <button
                    className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                    onClick={closeProject}
                    title="Back to Projects"
                >
                    <Home size={15}/>
                </button>
                <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">{projectName}</span>
                {/* Connection status */}
                <div className="ml-4 flex items-center gap-1.5">
                    <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                            connStatus === 'connected'
                                ? 'bg-green-500'
                                : connStatus === 'connecting'
                                    ? 'bg-yellow-400 animate-pulse'
                                    : 'bg-red-500'
                        }`}
                    />
                    <span className="text-[10px] text-[var(--color-text-muted)] select-none">
                        {connStatus === 'connected'
                            ? sceneName
                                ? `Connected · ${sceneName}`
                                : 'Connected'
                            : connStatus === 'connecting'
                                ? 'Connecting…'
                                : 'Disconnected'}
                    </span>
                </div>

                <div className="ml-auto flex items-center gap-1">
                    <button
                        className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                        onClick={handleSave}
                        title="Save project (Ctrl+S)"
                    >
                        <Save size={20}/>
                    </button>
                    <button
                        className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                        onClick={handleSaveAs}
                        title="Save project as…"
                    >
                        <SaveAll size={20}/>
                    </button>
                </div>
            </div>

            {/* ── Middle row: Sidebar | Inspector | Keyframe Table ── */}
            <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Project Sidebar – Scene list */}
                <aside
                    className="shrink-0 flex flex-col overflow-hidden bg-[var(--color-surface)] border-r border-[var(--color-border)]"
                    style={{width: sidebarWidth}}
                >
                    <ProjectSidebar/>
                </aside>

                {/* Sidebar ↔ Inspector handle */}
                <VHandle onMouseDown={handleSidebarMouseDown}/>

                {/* Inspector */}
                <aside
                    className="shrink-0 flex flex-col overflow-hidden bg-[var(--color-surface)]"
                    style={{width: inspectorWidth}}
                >
                    <PanelLabel>Inspector</PanelLabel>
                    <div className="flex-1 overflow-y-auto">
                        <KeyframeEditor send={send}/>
                    </div>
                </aside>

                {/* Inspector ↔ Keyframe Table handle */}
                <VHandle onMouseDown={handleInspectorMouseDown}/>

                {/* Keyframe Table */}
                <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-surface)]">
                    <PanelLabel>Keyframes</PanelLabel>
                    <div className="flex-1 overflow-hidden">
                        <KeyframeTable send={send} expanded showCopyPaste/>
                    </div>
                </main>
            </div>

            {/* ── Middle ↔ Bottom handle ── */}
            <HHandle onMouseDown={handleBottomMouseDown}/>

            {/* ── Bottom: Scene Editor + ControlPanel + Timeline ── */}
            <div
                className="shrink-0 flex flex-col overflow-hidden bg-[var(--color-surface)]"
                style={{height: bottomHeight}}
            >
                {/* Scene Editor – Shot blocks */}
                <div
                    className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]"
                    style={{height: SCENE_EDITOR_HEIGHT}}
                >
                    <SceneEditor/>
                </div>

                {/* ControlPanel — centered */}
                <div className="flex items-center justify-center px-4 py-2 shrink-0 border-b border-[var(--color-border)]">
                    <ControlPanel send={send}/>
                </div>

                {/* Timeline — fills remaining space */}
                <div className="flex-1 overflow-hidden min-h-0">
                    <Timeline send={send}/>
                </div>
            </div>

        </div>
    )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
    usePlaybackSync()
    useProjectPersistence()
    useShotKeyframeSync()

    const openProjectId = useProjectLibraryStore((s) => s.openProjectId)

    if (openProjectId === null) {
        return <ProjectOverview/>
    }

    return <EditorLayout/>
}
