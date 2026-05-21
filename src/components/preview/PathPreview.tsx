import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { useKeyframeStore } from '@/store/keyframeStore'
import { useCameraStore } from '@/store/cameraStore'
import { buildSplinePath } from '@/lib/spline'

// ── Zeeplevel JSON types ──────────────────────────────────────────────────────
interface CV3 { x: number; y: number; z: number }
interface BlockPropertyJSON { i: number; u: string; p: CV3; r: CV3; s: CV3; d?: Record<string, string> }
interface ZeepLevel { blox: BlockPropertyJSON[] }

// blocks.json entry exported by BlockMeshExporter
interface BlockPieceEntry {
  file: string
  defaultActive: boolean
  propertyIndex: number  // properties[propertyIndex] controls visibility; -1 = always shown
}
interface BlockMappingEntry {
  id: number
  uid: string
  name: string
  boundingBox: [number, number, number]
  boundingBoxOffset: [number, number, number]
  defaultEuler?: [number, number, number]
  defaultPosition?: [number, number, number]
  pieces?: BlockPieceEntry[]
  // legacy compat
  file?: string | null
}

// Resolved: blockId → array of pieces with geometry + metadata
interface BlockPieceGeo {
  geo: THREE.BufferGeometry
  defaultActive: boolean
  propertyIndex: number
}
interface BlockGeoEntry {
  pieces: BlockPieceGeo[]
  defaultEuler: [number, number, number]
  defaultPosition: [number, number, number]
}
type BlockGeometryMap = Map<number, BlockGeoEntry>

// Default fallback bounding box (Unity units)
const DEFAULT_BLOCK_SIZE: CV3 = { x: 16, y: 8, z: 16 }

// ── Sync game camera position into Three.js camera ──────────────────────────
function CameraSync() {
  const { camera, invalidate } = useThree()
  const pendingCameraPos = useCameraStore((s) => s.pendingCameraPos)
  const clearCameraPos = useCameraStore((s) => s.clearCameraPos)

  useEffect(() => {
    if (!pendingCameraPos) return
    const { pos, rot } = pendingCameraPos
    // Unity left-handed → Three.js right-handed: negate Z position, negate Y and Z euler
    camera.position.set(pos[0], pos[1], -pos[2])
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(rot[0]),
      THREE.MathUtils.degToRad(-rot[1]),
      THREE.MathUtils.degToRad(-rot[2]),
      'YXZ',
    )
    camera.quaternion.setFromEuler(euler)
    invalidate()
    clearCameraPos()
  }, [pendingCameraPos, camera, invalidate, clearCameraPos])

  return null
}

// ── Invalidate canvas on keyframe changes (frameloop="demand") ────────────────
function InvalidateOnChange() {
  const { invalidate } = useThree()
  const keyframes = useKeyframeStore((s) => s.keyframes)
  const selectedId = useKeyframeStore((s) => s.selectedId)
  useEffect(() => { invalidate() }, [keyframes, selectedId, invalidate])
  return null
}

// ── WASD + QE FPS camera controller ──────────────────────────────────────────
function FPSControls() {
  const { camera, gl, invalidate } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const isLocked = useRef(false)
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const speed = useRef(20)

  useEffect(() => {
    const canvas = gl.domElement

    const onKeyDown = (e: KeyboardEvent) => { keys.current.add(e.code); invalidate() }
    const onKeyUp = (e: KeyboardEvent) => { keys.current.delete(e.code) }

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return
      euler.current.y -= e.movementX * 0.002
      euler.current.x -= e.movementY * 0.002
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
      camera.quaternion.setFromEuler(euler.current)
      invalidate()
    }

    const onWheel = (e: WheelEvent) => {
      // Scroll up = faster, scroll down = slower
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2
      speed.current = Math.max(1, Math.min(2000, speed.current * factor))
      invalidate()
    }

    const onClick = () => {
      if (!isLocked.current) canvas.requestPointerLock()
    }

    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas
    }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('wheel', onWheel)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [camera, gl, invalidate])

  useFrame((_, delta) => {
    if (!isLocked.current) return
    const s = speed.current * delta
    const dir = new THREE.Vector3()
    if (keys.current.has('KeyW')) dir.z -= 1
    if (keys.current.has('KeyS')) dir.z += 1
    if (keys.current.has('KeyA')) dir.x -= 1
    if (keys.current.has('KeyD')) dir.x += 1
    if (keys.current.has('KeyQ')) dir.y -= 1
    if (keys.current.has('KeyE')) dir.y += 1
    if (dir.lengthSq() > 0) {
      dir.normalize().applyQuaternion(camera.quaternion)
      camera.position.addScaledVector(dir, s)
      invalidate()
    }
  })

  return null
}

// ── Camera path spline + keyframe spheres ─────────────────────────────────────
function CameraPath() {
  const keyframes = useKeyframeStore((s) => s.keyframes)
  const selectedId = useKeyframeStore((s) => s.selectedId)

  const points = useMemo(() => {
    if (keyframes.length < 2) return []
    const positions = keyframes.map((kf) => kf.pos)
    return buildSplinePath(positions, 20)
  }, [keyframes])

  if (points.length < 2) return null

  const linePoints = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))

  return (
    <>
      <Line points={linePoints} color="#6366f1" lineWidth={1.5} />
      {keyframes.map((kf) => (
        <mesh key={kf.id} position={[kf.pos[0], kf.pos[1], kf.pos[2]]}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshBasicMaterial color={kf.id === selectedId ? '#818cf8' : '#4b5563'} />
        </mesh>
      ))}
    </>
  )
}

// ── Single block: real mesh wireframe or fallback box ─────────────────────────
function BlockMesh({
  block,
  geoMap,
}: {
  block: BlockPropertyJSON
  geoMap: BlockGeometryMap
}) {
  // Unity tr.eulerAngles applies internally as YXZ order.
  // Unity is left-handed → negate Y rotation when converting to right-handed Three.js.
  const euler = useMemo(
    () => new THREE.Euler(
      THREE.MathUtils.degToRad(-block.r.x),  // X: negiert
      THREE.MathUtils.degToRad(-block.r.y),  // Y: negiert (Z-Achsen-Flip)
      THREE.MathUtils.degToRad(block.r.z),   // Z: nicht negiert
      'YXZ',
    ),
    [block.r.x, block.r.y, block.r.z],
  )

  const entry = geoMap.get(block.i)

  if (entry && entry.pieces.length > 0) {
    // Determine which pieces are active based on block.d properties
    // d.n format: "@{p0=84; p1=0; p2=0; a0=1}" where p0 = properties[26], p1 = properties[27] etc.
    const activePieces = entry.pieces.filter((piece) => {
      if (piece.propertyIndex < 0) return true // always shown
      if (!block.d) return piece.defaultActive
      // Parse the 'n' string: "@{p0=84; p1=0; ...}"
      const nStr = String(block.d['n'] ?? '')
      const pieceIdx = piece.propertyIndex - 26
      const match = nStr.match(new RegExp(`p${pieceIdx}=(\\d+)`))
      if (!match) return piece.defaultActive
      return parseFloat(match[1]) >= 0.01
    })

    return (
      <group
        position={[block.p.x, block.p.y, -block.p.z]}
        rotation={euler}
        scale={[block.s.x, block.s.y, block.s.z]}
      >
        {activePieces.map((piece, idx) => (
          <lineSegments key={idx}>
            <edgesGeometry args={[piece.geo]} />
            <lineBasicMaterial color="#2563eb" transparent opacity={0.5} />
          </lineSegments>
        ))}
      </group>
    )
  }

  // Fallback: bounding box wireframe
  const size: [number, number, number] = [
    DEFAULT_BLOCK_SIZE.x * block.s.x,
    DEFAULT_BLOCK_SIZE.y * block.s.y,
    DEFAULT_BLOCK_SIZE.z * block.s.z,
  ]
  return (
    <lineSegments position={[block.p.x, block.p.y, -block.p.z]} rotation={euler}>
      <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
      <lineBasicMaterial color="#1e3a5f" transparent opacity={0.35} />
    </lineSegments>
  )
}

// ── Level wireframe (all blocks) ──────────────────────────────────────────────
function LevelWireframe({
  blocks,
  geoMap,
}: {
  blocks: BlockPropertyJSON[]
  geoMap: BlockGeometryMap
}) {
  const { invalidate } = useThree()
  useEffect(() => { invalidate() }, [blocks, geoMap, invalidate])

  return (
    <>
      {blocks.map((block, i) => (
        <BlockMesh key={`${block.i}-${i}`} block={block} geoMap={geoMap} />
      ))}
    </>
  )
}

// ── Parse OBJ text → BufferGeometry[] ────────────────────────────────────────
function parseOBJ(text: string): THREE.BufferGeometry[] {
  const loader = new OBJLoader()
  const obj = loader.parse(text)
  const geos: THREE.BufferGeometry[] = []
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (mesh.geometry) geos.push(mesh.geometry)
    }
  })
  return geos
}

// ── Main component ────────────────────────────────────────────────────────────
export function PathPreview() {
  const keyframes = useKeyframeStore((s) => s.keyframes)
  const [levelBlocks, setLevelBlocks] = useState<BlockPropertyJSON[]>([])
  const [levelName, setLevelName] = useState<string | null>(null)
  const [geoMap, setGeoMap] = useState<BlockGeometryMap>(new Map())
  const [meshesLoaded, setMeshesLoaded] = useState(false)
  const [meshLoadProgress, setMeshLoadProgress] = useState<{ loaded: number; total: number } | null>(null)

  const levelFileRef = useRef<HTMLInputElement>(null)
  const blocksFileRef = useRef<HTMLInputElement>(null)

  // Load .zeeplevel file
  const handleLevelLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string) as ZeepLevel
        if (!Array.isArray(json.blox)) throw new Error('Invalid .zeeplevel format')
        setLevelBlocks(json.blox)
        setLevelName(file.name)
      } catch (err) {
        console.error('Error loading level:', err)
        alert('Invalid .zeeplevel file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  // Load blocks/ folder (blocks.json + OBJ files)
  const handleBlocksLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Find blocks.json
    let mappingFile: File | null = null
    const objFiles = new Map<string, File>()

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const name = f.name
      if (name === 'blocks.json') mappingFile = f
      else if (name.endsWith('.obj')) objFiles.set(name, f)
    }

    if (!mappingFile) {
      alert('blocks.json not found. Please select the entire "blocks" folder.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const mapping = JSON.parse(ev.target?.result as string) as BlockMappingEntry[]
        const map: BlockGeometryMap = new Map()

        // Collect all entries that have at least one piece OBJ file available
        const toLoad = mapping.filter((e) =>
          e.pieces ? e.pieces.some((p) => objFiles.has(p.file)) : (e.file && objFiles.has(e.file!))
        )
        const total = toLoad.length
        let loaded = 0
        setMeshLoadProgress({ loaded: 0, total })

        for (const entry of toLoad) {
          const pieceGeos: BlockPieceGeo[] = []

          if (entry.pieces && entry.pieces.length > 0) {
            // New format: per-piece OBJ files
            for (const piece of entry.pieces) {
              const objFile = objFiles.get(piece.file)
              if (!objFile) continue
              const text = await objFile.text()
              const geos = parseOBJ(text)
              for (const geo of geos) {
                pieceGeos.push({ geo, defaultActive: piece.defaultActive, propertyIndex: piece.propertyIndex })
              }
            }
          } else if (entry.file && objFiles.has(entry.file)) {
            // Legacy format: single OBJ file
            const text = await objFiles.get(entry.file)!.text()
            const geos = parseOBJ(text)
            for (const geo of geos) {
              pieceGeos.push({ geo, defaultActive: true, propertyIndex: -1 })
            }
          }

          if (pieceGeos.length > 0) {
            map.set(entry.id, {
              pieces: pieceGeos,
              defaultEuler: entry.defaultEuler ?? [0, 0, 0],
              defaultPosition: entry.defaultPosition ?? [0, 0, 0],
            })
          }
          loaded++
          setMeshLoadProgress({ loaded, total })
        }

        setGeoMap(map)
        setMeshesLoaded(true)
        setMeshLoadProgress(null)
      } catch (err) {
        console.error('Error loading block meshes:', err)
        alert('Error loading block meshes')
        setMeshLoadProgress(null)
      }
    }
    reader.readAsText(mappingFile)
    e.target.value = ''
  }, [])

  const clearLevel = useCallback(() => {
    setLevelBlocks([])
    setLevelName(null)
  }, [])

  const hasContent = keyframes.length > 0 || levelBlocks.length > 0

  return (
    <div className="relative w-full h-full select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {levelName && (
          <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface)]/80 px-2 py-0.5 rounded truncate max-w-[160px]">
            {levelName} ({levelBlocks.length} blocks)
          </span>
        )}

        {/* Load block meshes folder */}
        <button
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => blocksFileRef.current?.click()}
          title='Load exported "blocks" folder (blocks.json + OBJ files)'
        >
          {meshLoadProgress
            ? `Loading… ${meshLoadProgress.loaded}/${meshLoadProgress.total}`
            : meshesLoaded
            ? `✓ Meshes (${geoMap.size})`
            : '+ Block Meshes'}
        </button>

        {/* Load .zeeplevel */}
        <button
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => levelFileRef.current?.click()}
          title="Load Zeepkist level (.zeeplevel)"
        >
          {levelName ? 'Change Level' : '+ Level (.zeeplevel)'}
        </button>

        {levelName && (
          <button
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            onClick={clearLevel}
            title="Remove level"
          >
            ✕
          </button>
        )}

        {/* Hidden inputs */}
        <input
          ref={blocksFileRef}
          type="file"
          // @ts-expect-error webkitdirectory is non-standard
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleBlocksLoad}
        />
        <input
          ref={levelFileRef}
          type="file"
          accept=".zeeplevel"
          className="hidden"
          onChange={handleLevelLoad}
        />
      </div>

      {/* FPS hint overlay */}
      <div className="absolute bottom-2 left-2 z-10 text-[9px] text-[var(--color-text-muted)] pointer-events-none select-none">
        Click to activate · WASD move · QE up/down · Scroll = speed · ESC exit
      </div>

      {!hasContent ? (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-xs">
          No keyframes yet
        </div>
      ) : (
        <Canvas
          frameloop="demand"
          camera={{ position: [10, 10, 10], fov: 60, near: 0.1, far: 50000 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: false }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <InvalidateOnChange />
          <CameraSync />
          <ambientLight intensity={0.5} />
          {levelBlocks.length > 0 && (
            <LevelWireframe blocks={levelBlocks} geoMap={geoMap} />
          )}
          <CameraPath />
          <FPSControls />
          <gridHelper args={[200, 200, '#2a2d38', '#1e2028']} />
        </Canvas>
      )}
    </div>
  )
}
