import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, MeshReflectorMaterial, OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

const COLORS = ['#606965', '#243323', '#57121e']
const damp = THREE.MathUtils.damp
const clamp = THREE.MathUtils.clamp

function Car({ finish, weather, onReady }) {
  const gltf = useGLTF('/models/ferrari.glb', '/draco/')
  const shadow = useTexture('/models/ferrari_ao.png')
  const wet = useRef({ value: 0 })
  const { model, paint, drops, dropMaterial } = useMemo(() => {
    const model = gltf.scene.clone(true)
    model.updateMatrixWorld(true)
    const paint = new THREE.MeshPhysicalMaterial({
      color: COLORS[0], metalness: 0.88, roughness: 0.23,
      clearcoat: 1, clearcoatRoughness: 0.065, envMapIntensity: 0.95,
    })
    paint.onBeforeCompile = (shader) => {
      shader.uniforms.uWet = wet.current
      shader.vertexShader = 'varying vec3 vPaintPosition;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPosition = position;')
      shader.fragmentShader = `
        uniform float uWet;
        varying vec3 vPaintPosition;
        float waterBeads(vec2 p) {
          vec2 cell = floor(p);
          vec2 h = fract(sin(vec2(dot(cell, vec2(127.1,311.7)), dot(cell,vec2(269.5,183.3)))) * 43758.5453);
          float r = 0.11 + h.x * 0.24;
          float d = length(fract(p) - (0.25 + h * 0.5));
          return sqrt(max(0.0, 1.0 - pow(d / r, 2.0))) * step(d, r) * step(0.28, h.y);
        }
      ` + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        float height = waterBeads(vPaintPosition.xz * 155.0) * 0.00016 * uWet;
        vec3 sigmaX = dFdx(-vViewPosition);
        vec3 sigmaY = dFdy(-vViewPosition);
        vec3 r1 = cross(sigmaY, normal);
        vec3 r2 = cross(normal, sigmaX);
        float det = dot(sigmaX, r1);
        vec3 grad = sign(det) * (dFdx(height) * r1 + dFdy(height) * r2);
        normal = normalize(abs(det) * normal - grad);
      `)
    }
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#47514c', metalness: 0.9, roughness: 0.22 })
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#172123', metalness: 0.2, roughness: 0.055,
      clearcoat: 0.5, transparent: true, opacity: 0.96, envMapIntensity: 0.9,
    })
    model.traverse((mesh) => {
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (mesh.name === 'body') mesh.material = paint
      else if (mesh.name === 'glass') mesh.material = glassMaterial
      else if (/^rim_|^trim$/.test(mesh.name)) mesh.material = wheelMaterial
      else {
        mesh.material = mesh.material.clone()
        if (/tire/i.test(mesh.material.name)) {
          mesh.material.color.set('#101112')
          mesh.material.roughness = 0.9
          mesh.material.metalness = 0
        }
        if (/Leather|Interior|Carpet/i.test(mesh.material.name)) {
          mesh.material.color.set('#161c19')
          mesh.material.roughness = 0.8
          mesh.material.metalness = 0
        }
      }
    })

    const body = model.getObjectByName('body')
    const sampler = new MeshSurfaceSampler(body).build()
    const count = window.innerWidth < 768 ? 1000 : 3000
    const dropMaterial = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.04,
      transmission: 0.96, thickness: 0.004, ior: 1.333,
      clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 0.85,
      transparent: true, opacity: 0,
    })
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), dropMaterial, count)
    drops.name = 'surface-water'
    const point = new THREE.Vector3(), normal = new THREE.Vector3()
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(body.matrixWorld)
    for (let i = 0; i < count; i++) {
      sampler.sample(point, normal)
      point.applyMatrix4(body.matrixWorld)
      normal.applyNormalMatrix(normalMatrix)
      if (normal.y < -0.1) { i--; continue }
      const size = 0.002 + Math.pow(Math.random(), 2) * 0.0055
      dummy.position.copy(point).addScaledVector(normal, size * 0.24)
      dummy.quaternion.setFromUnitVectors(up, normal)
      dummy.scale.set(size, size * 0.48, size)
      dummy.updateMatrix()
      drops.setMatrixAt(i, dummy.matrix)
    }
    drops.instanceMatrix.needsUpdate = true
    drops.frustumCulled = false
    return { model, paint, drops, dropMaterial }
  }, [gltf])

  useEffect(() => { onReady() }, [onReady])
  useEffect(() => {
    return () => {
      model.traverse((obj) => { if (obj.isMesh) obj.material.dispose() })
      drops.geometry.dispose()
      dropMaterial.dispose()
    }
  }, [model, drops, dropMaterial])
  const nextColor = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    wet.current.value = damp(wet.current.value, weather.current, 1.6, dt)
    paint.color.lerp(nextColor.set(COLORS[finish]), 1 - Math.exp(-dt * 4))
    paint.roughness = THREE.MathUtils.lerp(0.23, 0.13, wet.current.value)
    paint.clearcoatRoughness = THREE.MathUtils.lerp(0.065, 0.035, wet.current.value)
    drops.visible = wet.current.value > 0.02
    dropMaterial.opacity = wet.current.value * 0.88
  })
  return (
    <group>
      <primitive object={model} />
      <primitive object={drops} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={2}>
        <planeGeometry args={[2.62, 5.2]} />
        <meshBasicMaterial map={shadow} transparent blending={THREE.MultiplyBlending} premultipliedAlpha toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Rain({ weather }) {
  const lines = useRef()
  const count = window.innerWidth < 768 ? 750 : 1800
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 6)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = (Math.random() - 0.5) * 16
      seeds[i * 4 + 1] = Math.random() * 9
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 15
      seeds[i * 4 + 3] = 0.04 + Math.random() * 0.14
    }
    return { positions, seeds }
  }, [count])
  useFrame(({ clock }, dt) => {
    const rain = weather.current
    lines.current.material.opacity = damp(lines.current.material.opacity, rain * 0.27, 2, dt)
    lines.current.visible = lines.current.material.opacity > 0.002
    if (!lines.current.visible) return
    const time = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const s = i * 4, v = i * 6
      const y = ((seeds[s + 1] - time * (4 + seeds[s + 3] * 10)) % 9 + 9) % 9
      const x = seeds[s] + y * 0.08
      positions[v] = x
      positions[v + 1] = y
      positions[v + 2] = seeds[s + 2]
      positions[v + 3] = x + seeds[s + 3] * 0.08
      positions[v + 4] = y + seeds[s + 3]
      positions[v + 5] = seeds[s + 2]
    }
    lines.current.geometry.attributes.position.needsUpdate = true
  })
  return (
    <lineSegments ref={lines} name="rainfall">
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#b7ced1" transparent opacity={0} depthWrite={false} />
    </lineSegments>
  )
}

function Studio({ weather }) {
  const floor = useRef()
  useEffect(() => {
    const material = floor.current
    const compileReflection = material.onBeforeCompile
    // A studio floor should catch the vehicle without turning a grazing key
    // light into a white cyclorama when the camera reaches the rear shot.
    material.onBeforeCompile = function (shader) {
      compileReflection.call(this, shader)
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        '#include <lights_fragment_end>\nreflectedLight.directSpecular *= 0.045;\nreflectedLight.indirectSpecular *= 0.15;',
      )
    }
    material.needsUpdate = true
  }, [])
  useFrame((_, dt) => {
    floor.current.roughness = damp(floor.current.roughness, weather.current ? 0.29 : 0.65, 1.2, dt)
  })
  return (
    <>
      <color attach="background" args={['#0a0d0e']} />
      <fog attach="fog" args={['#0a0d0e', 13, 32]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[1, 8, -3]} angle={0.8} penumbra={0.8} intensity={110} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      <spotLight position={[-5, 5, 4]} color="#d4e7d4" intensity={100} angle={0.85} penumbra={0.8} />
      <pointLight position={[4, 3, -4]} color="#dbe2ee" intensity={14} distance={12} />
      <Environment files="/environment/studio.hdr" environmentIntensity={0.85} environmentRotation={[0, Math.PI / 4, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <MeshReflectorMaterial ref={floor} resolution={512} mirror={0.35} blur={[350, 100]} mixBlur={0.85} mixStrength={1.9} roughness={0.65} depthScale={0.45} minDepthThreshold={0.5} maxDepthThreshold={1.5} color="#0d1210" metalness={0.15} envMapIntensity={0.025} />
      </mesh>
      <mesh position={[0, 4, 8]} receiveShadow>
        <planeGeometry args={[44, 8]} />
        <meshStandardMaterial color="#111715" roughness={0.94} metalness={0.15} />
      </mesh>
      {/* Architectural seams and a single floating studio light. */}
      {[-12, -8, -4, 0, 4, 8, 12].map(x => (
        <mesh key={x} position={[x, 3.3, 7.98]}>
          <boxGeometry args={[0.014, 6.6, 0.02]} />
          <meshBasicMaterial color="#202824" />
        </mesh>
      ))}
      {[-5, -10].map(x => <mesh key={x} position={[x, 2.8, 7.9]}>
        <boxGeometry args={[0.012, 3.8, 0.02]} />
        <meshBasicMaterial color="#586650" toneMapped={false} />
      </mesh>)}
      <Rain weather={weather} />
    </>
  )
}

const SHOTS = [
  { p: 0, position: [5.9, 2.1, -6.9], target: [1.3, 0.62, 0.4], fov: 34 },
  { p: 0.33, position: [4.8, 2.7, -5.8], target: [1.1, 0.65, 0.2], fov: 35 },
  { p: 0.6667, position: [2.1, 1.8, -3.1], target: [0.65, 0.75, -1.1], fov: 36 },
  { p: 0.84, position: [5.8, 1.8, 0.5], target: [0.6, 0.6, 1.1], fov: 35 },
  { p: 1, position: [5.9, 2.1, 6.7], target: [-0.6, 0.6, 1.3], fov: 35 },
]

function Director({ progress, free, reducedMotion, weather, weatherOverride }) {
  const { camera, size } = useThree()
  const smoothed = useRef(progress.current)
  const lookAt = useRef(new THREE.Vector3(...SHOTS[0].target))
  const point = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const move = (event) => {
      pointer.current = { x: (event.clientX / innerWidth - 0.5), y: (event.clientY / innerHeight - 0.5) }
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useFrame((state, dt) => {
    smoothed.current = reducedMotion ? progress.current : damp(smoothed.current, progress.current, 4, Math.min(dt, 0.25))
    const p = smoothed.current
    weather.current = weatherOverride === null ? (p > 0.18 && p < 0.86 ? 1 : 0) : Number(weatherOverride)
    if (free) return
    let a = SHOTS[0], b = SHOTS[1]
    for (let i = 0; i < SHOTS.length - 1; i++) {
      if (p >= SHOTS[i].p) { a = SHOTS[i]; b = SHOTS[i + 1] }
    }
    const t = THREE.MathUtils.smootherstep(clamp((p - a.p) / (b.p - a.p), 0, 1), 0, 1)
    point.fromArray(a.position).lerp(new THREE.Vector3(...b.position), t)
    target.fromArray(a.target).lerp(new THREE.Vector3(...b.target), t)
    const mobile = size.width < 768
    if (mobile) {
      point.x *= 1.32
      point.z *= 1.32
      target.x = 0
      target.y = 0.55
    }
    if (!reducedMotion) {
      point.x += pointer.current.x * 0.1
      point.y += pointer.current.y * 0.05 + Math.sin(state.clock.elapsedTime * 0.3) * 0.014
    }
    if (reducedMotion) {
      camera.position.copy(point)
      lookAt.current.copy(target)
    } else {
      camera.position.lerp(point, 1 - Math.exp(-dt * 5))
      lookAt.current.lerp(target, 1 - Math.exp(-dt * 5))
    }
    camera.lookAt(lookAt.current)
    camera.fov = THREE.MathUtils.lerp(a.fov, b.fov, t) + (mobile ? 13 : 0)
    camera.updateProjectionMatrix()
  })
  return null
}

export default function Scene({ progress, finish, free, reducedMotion, weatherOverride, onReady, onUnavailable }) {
  const weather = useRef(0)
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: SHOTS[0].position, fov: 35, near: 0.05, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.82 }}
      onCreated={({ gl, scene, camera }) => {
        gl.transmissionResolutionScale = 0.5
        if (import.meta.env.DEV) window.__AUREL_SCENE__ = { scene, camera, gl }
        gl.domElement.addEventListener('webglcontextlost', onUnavailable)
      }}
      fallback={<WebGLFallback onReady={onReady} />}
    >
      <Suspense fallback={null}>
        <Studio weather={weather} />
        <Car finish={finish} weather={weather} onReady={onReady} />
      </Suspense>
      <Director progress={progress} free={free} weather={weather} weatherOverride={weatherOverride} reducedMotion={reducedMotion} />
      {free && <OrbitControls makeDefault target={[0, 0.6, 0]} minDistance={2.5} maxDistance={12} maxPolarAngle={Math.PI / 2 - 0.015} enablePan={false} enableDamping />}
    </Canvas>
  )
}

function WebGLFallback({ onReady }) {
  useEffect(onReady, [onReady])
  return <div className="webgl-fallback">Your browser needs WebGL to enter the studio. Try a browser with hardware acceleration enabled.</div>
}
