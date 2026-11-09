import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneFallback } from './sceneFallback'

// ─── Geometry helpers ────────────────────────────────────────────────────────
function fibonacciSphere(n, radius) {
  const pts = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    // slight jitter so it reads as organic, not a perfect lattice
    const j = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.06
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius * j, y * radius * j, Math.sin(theta) * r * radius * j))
  }
  return pts
}

/** Connect each node to its k nearest neighbours (deduplicated). */
function nearestEdges(points, k) {
  const edges = new Set()
  const out = []
  points.forEach((p, i) => {
    const d = points.map((q, j) => [j, i === j ? Infinity : p.distanceToSquared(q)]).sort((a, b) => a[1] - b[1])
    for (let m = 0; m < k; m++) {
      const j = d[m][0]
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (!edges.has(key)) { edges.add(key); out.push([i, j]) }
    }
  })
  return out
}

function readAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(/\s+/).map(Number)
  return v.length === 3 ? new THREE.Color(v[0] / 255, v[1] / 255, v[2] / 255) : new THREE.Color('#8b5cf6')
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function Network({ count, light, progress, reduced }) {
  const group = useRef()
  const core = useRef()
  const flowRef = useRef()
  const { pointer } = useThree()
  const radius = 2.2

  const { nodes, lineGeo, nodeGeo, edges } = useMemo(() => {
    const nodes = fibonacciSphere(count, radius)
    const edges = nearestEdges(nodes, 3)
    const linePos = new Float32Array(edges.length * 6)
    edges.forEach(([a, b], i) => { nodes[a].toArray(linePos, i * 6); nodes[b].toArray(linePos, i * 6 + 3) })
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    const nodePos = new Float32Array(nodes.length * 3)
    const sizes = new Float32Array(nodes.length)
    nodes.forEach((p, i) => { p.toArray(nodePos, i * 3); sizes[i] = 0.6 + ((i * 7919) % 100) / 100 })
    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3))
    nodeGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return { nodes, lineGeo, nodeGeo, edges }
  }, [count])

  // Particles that travel along random edges ("knowledge flowing")
  const flowCount = Math.min(140, edges.length)
  const flow = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flowCount * 3), 3))
    const state = Array.from({ length: flowCount }, () => ({ e: Math.floor(Math.random() * edges.length), t: Math.random(), s: 0.25 + Math.random() * 0.6 }))
    return { geo, state }
  }, [edges, flowCount])

  const accent = useMemo(() => readAccent(), [light]) // eslint-disable-line react-hooks/exhaustive-deps
  const blending = light ? THREE.NormalBlending : THREE.AdditiveBlending

  const nodeMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending,
    uniforms: { uColor: { value: accent }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: `attribute float size; uniform float uPixel; varying float vDepth;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vDepth = clamp((-mv.z-3.)/5.,0.,1.);
      gl_PointSize = size * 9. * uPixel * (4.5 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vDepth;
      void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
      float a = smoothstep(.5,0.,d); gl_FragColor = vec4(mix(vec3(1.), uColor, .55 + d), a * (1. - vDepth*.7)); }`
  }), [accent, blending])

  useEffect(() => () => { lineGeo.dispose(); nodeGeo.dispose(); flow.geo.dispose(); nodeMat.dispose() }, [lineGeo, nodeGeo, flow, nodeMat])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const p = progress.current
    if (!reduced) {
      g.rotation.y += dt * 0.08
      // pointer parallax (eased)
      g.rotation.x += ((pointer.y * 0.35) - g.rotation.x) * 0.04
      g.position.x += ((pointer.x * 0.25) - g.position.x) * 0.04
      core.current.rotation.x += dt * 0.15
      core.current.rotation.z += dt * 0.1
    }
    // scroll: pull the camera back and sink the sphere as the hero scrolls away
    state.camera.position.z = 6.2 + p * 3
    g.position.y = -p * 1.2
    g.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.6) * (reduced ? 0 : 0.012))

    // advance flow particles
    if (!reduced) {
      const arr = flow.geo.attributes.position.array
      flow.state.forEach((f, i) => {
        f.t += dt * f.s
        if (f.t >= 1) { f.t = 0; f.e = Math.floor(Math.random() * edges.length) }
        const [a, b] = edges[f.e]
        const A = nodes[a], B = nodes[b]
        arr[i * 3] = A.x + (B.x - A.x) * f.t
        arr[i * 3 + 1] = A.y + (B.y - A.y) * f.t
        arr[i * 3 + 2] = A.z + (B.z - A.z) * f.t
      })
      flow.geo.attributes.position.needsUpdate = true
    }
  })

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color={accent} transparent opacity={light ? 0.28 : 0.22} blending={blending} depthWrite={false} />
      </lineSegments>
      <points geometry={nodeGeo} material={nodeMat} />
      <points ref={flowRef} geometry={flow.geo}>
        <pointsMaterial color={light ? '#2563eb' : '#93c5fd'} size={0.05} sizeAttenuation transparent opacity={0.95} blending={blending} depthWrite={false} />
      </points>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial color={accent} wireframe transparent opacity={light ? 0.35 : 0.25} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={light ? 0.12 : 0.18} blending={blending} />
      </mesh>
    </group>
  )
}

/**
 * The hero's 3D knowledge network. Pauses rendering when off-screen or the tab is hidden,
 * renders a single static frame for reduced motion, and scales detail to the device.
 */
export default function KnowledgeScene({ progress, light }) {
  const wrap = useRef(null)
  const [visible, setVisible] = useState(true)
  const [failed, setFailed] = useState(false)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const small = useMemo(() => window.innerWidth < 768, [])
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 })
    if (wrap.current) io.observe(wrap.current)
    const onVis = () => setVisible(v => (document.hidden ? false : v || true))
    document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  if (failed) return <SceneFallback />
  return (
    <div ref={wrap} className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, small || lowPower ? 1.5 : 2]}
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        frameloop={reduced ? 'demand' : visible ? 'always' : 'never'}
        gl={{ antialias: !small, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setFailed(true) })
        }}
      >
        <Network count={small || lowPower ? 110 : 190} light={light} progress={progress} reduced={reduced} />
      </Canvas>
    </div>
  )
}
