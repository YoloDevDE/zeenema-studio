import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useKeyframeStore } from '@/store/keyframeStore'
import { buildSplinePath } from '@/lib/spline'

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
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color={kf.id === selectedId ? '#818cf8' : '#4b5563'} />
        </mesh>
      ))}
    </>
  )
}

export function PathPreview() {
  const keyframes = useKeyframeStore((s) => s.keyframes)

  if (keyframes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-xs">
        No keyframes yet
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: [10, 10, 10], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <CameraPath />
      <OrbitControls makeDefault />
      <gridHelper args={[20, 20, '#2a2d38', '#1e2028']} />
    </Canvas>
  )
}
