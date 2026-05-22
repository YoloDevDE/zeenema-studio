import { useMemo, useRef, useEffect, useState, useCallback, useTransition } from 'react'
import type { ClientMessage } from '@/types/protocol'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { useKeyframeStore } from '@/store/keyframeStore'
import { useCameraStore } from '@/store/cameraStore'
import { useLevelStore } from '@/store/levelStore'
import { usePlaybackStore } from '@/store/playbackStore'
import { buildSplinePath, type SplineKeyframe } from '@/lib/spline'
import { applyEasing } from '@/lib/easing'
import {
  getCachedBlocksInfo,
  saveBlocksToCache,
  loadBlocksFromCache,
  clearBlocksCache,
  type CachedBlocksInfo,
} from '@/lib/blockMeshCache'

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

// ── Single keyframe node ──────────────────────────────────────────────────────
// Shared geometries to avoid per-instance allocations
const _nodeGeoOuter = new THREE.SphereGeometry(0.45, 8, 6)
const _nodeGeoInner = new THREE.SphereGeometry(0.16, 6, 4)
const _nodeGeoOuterSel = new THREE.SphereGeometry(0.55, 8, 6)
const _nodeGeoInnerSel = new THREE.SphereGeometry(0.22, 6, 4)

function KeyframeNode({ kf, isSelected }: { kf: { id: string; pos: [number,number,number] }; idx?: number; isSelected: boolean }) {
  return (
    <group position={[kf.pos[0], kf.pos[1], kf.pos[2]]}>
      {/* Outer translucent sphere */}
      <mesh geometry={isSelected ? _nodeGeoOuterSel : _nodeGeoOuter}>
        <meshBasicMaterial color={isSelected ? '#818cf8' : '#6366f1'} transparent opacity={isSelected ? 0.3 : 0.18} />
      </mesh>
      {/* Inner solid dot */}
      <mesh geometry={isSelected ? _nodeGeoInnerSel : _nodeGeoInner}>
        <meshBasicMaterial color={isSelected ? '#c7d2fe' : '#818cf8'} />
      </mesh>
    </group>
  )
}

// ── Animated camera frustum showing current interpolated position ────────────
function AnimatedCameraMarker() {
  const keyframes = useKeyframeStore((s) => s.keyframes)
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const groupRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()

  useEffect(() => { invalidate() }, [currentTime, invalidate])

  const pose = useMemo(() => {
    if (keyframes.length < 2) return null
    const sorted = [...keyframes].sort((a, b) => a.time - b.time)
    const t = currentTime
    // Helper: Unity quat [x,y,z,w] → Three.js Quaternion (negate x and z for left→right hand)
    const toThreeQuat = (r: [number, number, number, number]) =>
      new THREE.Quaternion(-r[0], r[1], -r[2], r[3])

    if (t <= sorted[0].time) {
      return { pos: sorted[0].pos, rot: toThreeQuat(sorted[0].rot) }
    }
    if (t >= sorted[sorted.length - 1].time) {
      const last = sorted[sorted.length - 1]
      return { pos: last.pos, rot: toThreeQuat(last.rot) }
    }
    let i = 0
    while (i < sorted.length - 1 && sorted[i + 1].time <= t) i++
    const kfA = sorted[i]
    const kfB = sorted[i + 1]
    const segDur = kfB.time - kfA.time
    const rawT = segDur > 0 ? (t - kfA.time) / segDur : 0
    const easedT = applyEasing(rawT, kfA.easing ?? 'linear', kfA.bezierHandles)
    const rotEasedT = applyEasing(rawT, kfA.rotEasing ?? kfA.easing ?? 'linear', kfA.rotBezierHandles ?? kfA.bezierHandles)

    // Position: linear lerp (spline handled by path line)
    const pos: [number, number, number] = [
      kfA.pos[0] + (kfB.pos[0] - kfA.pos[0]) * easedT,
      kfA.pos[1] + (kfB.pos[1] - kfA.pos[1]) * easedT,
      kfA.pos[2] + (kfB.pos[2] - kfA.pos[2]) * easedT,
    ]
    // Rotation: slerp with separate rotEasing
    const rot = toThreeQuat(kfA.rot).slerp(toThreeQuat(kfB.rot), rotEasedT)
    return { pos, rot }
  }, [keyframes, currentTime])

  if (!pose) return null

  // Unity left-handed → Three.js right-handed (Z flip)
  const threePos = new THREE.Vector3(pose.pos[0], pose.pos[1], -pose.pos[2])
  const threeQuat = pose.rot

  return (
    <group ref={groupRef} position={threePos} quaternion={threeQuat}>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.6, 0.4, 0.5]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
      {/* Frustum lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.ConeGeometry(0.5, 1.0, 4)]} />
        <lineBasicMaterial color="#fbbf24" />
      </lineSegments>
    </group>
  )
}

// ── Camera path spline + keyframe nodes ──────────────────────────────────────
function CameraPath() {
  const keyframes = useKeyframeStore((s) => s.keyframes)
  const selectedId = useKeyframeStore((s) => s.selectedId)

  // Unity left-handed → Three.js right-handed: negate Z
  const threePositions = useMemo(
    () => keyframes.map((kf) => [kf.pos[0], kf.pos[1], -kf.pos[2]] as [number, number, number]),
    [keyframes],
  )

  const splineKeyframes = useMemo<SplineKeyframe[]>(
    () => keyframes.map((kf) => ({
      pos: [kf.pos[0], kf.pos[1], -kf.pos[2]],
      easing: kf.easing,
      bezierHandles: kf.bezierHandles,
    })),
    [keyframes],
  )

  const points = useMemo(() => {
    if (threePositions.length < 2) return []
    return buildSplinePath(threePositions, 20, splineKeyframes)
  }, [threePositions, splineKeyframes])

  const linePoints = useMemo(
    () => points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    [points],
  )

  return (
    <>
      {linePoints.length >= 2 && (
        <Line points={linePoints} color="#6366f1" lineWidth={2} />
      )}
      {threePositions.map((pos, idx) => (
        <KeyframeNode key={keyframes[idx].id} kf={{ id: keyframes[idx].id, pos }} idx={idx} isSelected={keyframes[idx].id === selectedId} />
      ))}
      <AnimatedCameraMarker />
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
  // Unity left-handed (Z forward) → Three.js right-handed (Z backward):
  // Flip Z axis: negate X and Y rotations, keep Z.
  const euler = useMemo(
    () => new THREE.Euler(
      THREE.MathUtils.degToRad(-block.r.x),
      THREE.MathUtils.degToRad(-block.r.y),
      THREE.MathUtils.degToRad(block.r.z),
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

// ── Infinite grid (fades with distance) ──────────────────────────────────────
function InfiniteGrid() {
  const { camera, invalidate } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uFar: { value: 50000 },
      uColor: { value: new THREE.Color('#2a2d38') },
      uColorBright: { value: new THREE.Color('#3a3d4a') },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uCamPos;
      uniform float uFar;
      uniform vec3 uColor;
      uniform vec3 uColorBright;
      varying vec3 vWorldPos;
      float gridLine(float coord, float spacing) {
        float f = abs(fract(coord / spacing) - 0.5);
        float df = fwidth(coord / spacing);
        return clamp(0.5 - f / df, 0.0, 1.0);
      }
      void main() {
        float dist = length(vWorldPos.xz - uCamPos.xz);
        float fade = 1.0 - smoothstep(uFar * 0.3, uFar * 0.7, dist);
        float g1 = gridLine(vWorldPos.x, 1.0) + gridLine(vWorldPos.z, 1.0);
        float g10 = gridLine(vWorldPos.x, 10.0) + gridLine(vWorldPos.z, 10.0);
        float g100 = gridLine(vWorldPos.x, 100.0) + gridLine(vWorldPos.z, 100.0);
        float alpha = clamp(g1 * 0.15 + g10 * 0.35 + g100 * 0.6, 0.0, 1.0) * fade;
        vec3 col = mix(uColor, uColorBright, clamp(g100, 0.0, 1.0));
        gl_FragColor = vec4(col, alpha);
      }
    `,
  }), [])

  const lastCamPos = useRef(new THREE.Vector3())
  useFrame(() => {
    if (!meshRef.current) return
    const cam = camera.position
    if (!lastCamPos.current.equals(cam)) {
      meshRef.current.position.set(cam.x, 0, cam.z)
      material.uniforms.uCamPos.value.copy(cam)
      lastCamPos.current.copy(cam)
      invalidate()
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[100000, 100000]} />
    </mesh>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function PathPreview({ send }: { send: (msg: ClientMessage) => void }) {
  const keyframes = useKeyframeStore((s) => s.keyframes)
  // Level from store (pushed via WebSocket) or local file upload
  const storeLevelBlocks = useLevelStore((s) => s.blocks)
  const storeLevelName = useLevelStore((s) => s.levelName)
  const [fileLevelBlocks, setFileLevelBlocks] = useState<BlockPropertyJSON[]>([])
  const [fileLevelName, setFileLevelName] = useState<string | null>(null)
  // Prefer store level (from game) over file level
  const levelBlocks = storeLevelName ? storeLevelBlocks : fileLevelBlocks
  const levelName = storeLevelName ?? fileLevelName

  const [geoMap, setGeoMap] = useState<BlockGeometryMap>(new Map())
  const [meshesLoaded, setMeshesLoaded] = useState(false)
  const [meshLoadProgress, setMeshLoadProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [cacheInfo, setCacheInfo] = useState<CachedBlocksInfo | null>(null)
  const [, startTransition] = useTransition()

  const levelFileRef = useRef<HTMLInputElement>(null)
  const blocksFileRef = useRef<HTMLInputElement>(null)

  // Check cache on mount and auto-load if available
  useEffect(() => {
    getCachedBlocksInfo().then(async (info) => {
      if (!info) return
      setCacheInfo(info)
      // Auto-load meshes from cache
      setMeshLoadProgress({ loaded: 0, total: 1 })
      try {
        const cached = await loadBlocksFromCache((l, t) => setMeshLoadProgress({ loaded: l, total: t }))
        if (!cached) { setMeshLoadProgress(null); return }
        const map = await buildGeoMap(cached.blocksJson, cached.objFiles, (l, t) => setMeshLoadProgress({ loaded: l, total: t }))
        startTransition(() => {
          setGeoMap(map)
          setMeshesLoaded(true)
          setMeshLoadProgress(null)
        })
      } catch (err) {
        console.error('Auto-load from cache failed:', err)
        setMeshLoadProgress(null)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load .zeeplevel file
  const handleLevelLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string) as ZeepLevel
        if (!Array.isArray(json.blox)) throw new Error('Invalid .zeeplevel format')
        setFileLevelBlocks(json.blox)
        setFileLevelName(file.name)
      } catch (err) {
        console.error('Error loading level:', err)
        alert('Invalid .zeeplevel file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  // Core: parse mapping + obj texts → BlockGeometryMap
  const buildGeoMap = useCallback(async (
    blocksJsonText: string,
    objTexts: Map<string, string>,
    onProgress: (l: number, t: number) => void,
  ): Promise<BlockGeometryMap> => {
    const mapping = JSON.parse(blocksJsonText) as BlockMappingEntry[]
    const map: BlockGeometryMap = new Map()
    const toLoad = mapping.filter((e) =>
      e.pieces ? e.pieces.some((p) => objTexts.has(p.file)) : (e.file && objTexts.has(e.file!))
    )
    let loaded = 0
    for (const entry of toLoad) {
      const pieceGeos: BlockPieceGeo[] = []
      if (entry.pieces && entry.pieces.length > 0) {
        for (const piece of entry.pieces) {
          const text = objTexts.get(piece.file)
          if (!text) continue
          for (const geo of parseOBJ(text))
            pieceGeos.push({ geo, defaultActive: piece.defaultActive, propertyIndex: piece.propertyIndex })
        }
      } else if (entry.file && objTexts.has(entry.file)) {
        for (const geo of parseOBJ(objTexts.get(entry.file)!))
          pieceGeos.push({ geo, defaultActive: true, propertyIndex: -1 })
      }
      if (pieceGeos.length > 0)
        map.set(entry.id, { pieces: pieceGeos, defaultEuler: entry.defaultEuler ?? [0, 0, 0], defaultPosition: entry.defaultPosition ?? [0, 0, 0] })
      loaded++
      onProgress(loaded, toLoad.length)
    }
    return map
  }, [])

  // Load from IndexedDB cache
  const handleLoadFromCache = useCallback(async () => {
    setMeshLoadProgress({ loaded: 0, total: 1 })
    try {
      const cached = await loadBlocksFromCache((l, t) => setMeshLoadProgress({ loaded: l, total: t }))
      if (!cached) { alert('No cached block meshes found.'); setMeshLoadProgress(null); return }
      const map = await buildGeoMap(cached.blocksJson, cached.objFiles, (l, t) => setMeshLoadProgress({ loaded: l, total: t }))
      startTransition(() => {
        setGeoMap(map)
        setMeshesLoaded(true)
        setMeshLoadProgress(null)
      })
    } catch (err) {
      console.error('Error loading from cache:', err)
      alert('Error loading cached block meshes')
      setMeshLoadProgress(null)
    }
  }, [buildGeoMap, startTransition])

  // Load blocks/ folder (blocks.json + OBJ files) and save to cache
  const handleBlocksLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    let mappingFile: File | null = null
    const objFileMap = new Map<string, File>()
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.name === 'blocks.json') mappingFile = f
      else if (f.name.endsWith('.obj')) objFileMap.set(f.name, f)
    }
    if (!mappingFile) {
      alert('blocks.json not found. Please select the entire "blocks" folder.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const blocksJsonText = ev.target?.result as string
        // Read all OBJ texts
        const objTexts = new Map<string, string>()
        const objEntries = Array.from(objFileMap.entries())
        setMeshLoadProgress({ loaded: 0, total: objEntries.length })
        let ri = 0
        for (const [name, file] of objEntries) {
          objTexts.set(name, await file.text())
          ri++
          setMeshLoadProgress({ loaded: ri, total: objEntries.length })
        }
        // Save to IndexedDB cache
        await saveBlocksToCache(blocksJsonText, objTexts)
        const info = await getCachedBlocksInfo()
        setCacheInfo(info)
        // Build geo map
        const map = await buildGeoMap(blocksJsonText, objTexts, (l, t) => setMeshLoadProgress({ loaded: l, total: t }))
        startTransition(() => {
          setGeoMap(map)
          setMeshesLoaded(true)
          setMeshLoadProgress(null)
        })
      } catch (err) {
        console.error('Error loading block meshes:', err)
        alert('Error loading block meshes')
        setMeshLoadProgress(null)
      }
    }
    reader.readAsText(mappingFile)
    e.target.value = ''
  }, [buildGeoMap, startTransition])

  const clearLevel = useCallback(() => {
    setFileLevelBlocks([])
    setFileLevelName(null)
    useLevelStore.getState().clearLevel()
  }, [])

  const handleClearCache = useCallback(async () => {
    await clearBlocksCache()
    setCacheInfo(null)
    setGeoMap(new Map())
    setMeshesLoaded(false)
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

        {/* Load block meshes: from cache or folder */}
        {!meshesLoaded && cacheInfo && !meshLoadProgress && (
          <button
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            onClick={handleLoadFromCache}
            title={`Load cached meshes (${cacheInfo.blockCount} blocks, saved ${cacheInfo.savedAt})`}
          >
            ↺ Load Cached Meshes
          </button>
        )}
        <button
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => meshesLoaded ? handleClearCache() : blocksFileRef.current?.click()}
          title={meshesLoaded ? 'Clear cached meshes' : 'Load exported "blocks" folder (blocks.json + OBJ files)'}
        >
          {meshLoadProgress
            ? `Loading… ${meshLoadProgress.loaded}/${meshLoadProgress.total}`
            : meshesLoaded
            ? `✓ Meshes (${geoMap.size}) ✕`
            : '+ Block Meshes'}
        </button>

        {/* Send level from game */}
        <button
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => send({ type: 'GET_LEVEL' })}
          title="Request current level from game (must be in-game or in editor)"
        >
          ⬇ Level from Game
        </button>

        {/* Load .zeeplevel */}
        <button
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => levelFileRef.current?.click()}
          title="Load Zeepkist level (.zeeplevel)"
        >
          {levelName ? 'Change Level' : '+ Level (.zeeplevel)'}
        </button>
        {storeLevelName && (
          <span className="text-[10px] text-[var(--color-accent)] bg-[var(--color-surface)]/80 px-2 py-0.5 rounded">
            ⚡ From Game
          </span>
        )}

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

      {/* Loading screen overlay */}
      {meshLoadProgress && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-background)]/80 backdrop-blur-sm gap-3">
          <div className="text-sm text-[var(--color-text)]">Loading block meshes…</div>
          <div className="w-64 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-100"
              style={{ width: `${meshLoadProgress.total > 0 ? Math.round((meshLoadProgress.loaded / meshLoadProgress.total) * 100) : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
            {meshLoadProgress.loaded} / {meshLoadProgress.total}
          </div>
        </div>
      )}

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
          <InfiniteGrid />
        </Canvas>
      )}
    </div>
  )
}
