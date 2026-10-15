import { memo, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
RectAreaLightUniformsLib.init()
export const SUN_POSITION=[-12,5.5,18]
const ceiling=[]
for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
  if(Math.abs(row)+Math.abs(col)>3)continue
  ceiling.push([col*2.45+(row%2)*1.225,5.5,row*2.12])
}
function Hexagons({ capture=false, foam=false }) {
  const mesh=useMemo(()=>{
    const fixtures=ceiling.map(p=>({p,r:[Math.PI/2,0,Math.PI/6]}))
    const material=new THREE.MeshBasicMaterial({color:foam?'#c3deff':'#dce9ee',toneMapped:false,side:THREE.DoubleSide})
    material.color.multiplyScalar(capture?1.35:2.6)
    const mesh=new THREE.InstancedMesh(new THREE.RingGeometry(1.32,1.365,6),material,fixtures.length),dummy=new THREE.Object3D()
    fixtures.forEach(({p,r},i)=>{dummy.position.fromArray(p);dummy.rotation.set(...r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)})
    mesh.instanceMatrix.needsUpdate=true;mesh.name=capture?'hex-reflection-rig':'hexagon-lighting';return mesh
  },[capture,foam])
  useEffect(()=>()=>{mesh.geometry.dispose();mesh.material.dispose()},[mesh])
  return <primitive object={mesh}/>
}
function Floor({ state }) {
  const floor=useRef()
  const uniforms=useMemo(()=>({uFloorWet:{value:0},uFloorTime:{value:0}}),[])
  useEffect(()=>{
    const material=floor.current,compile=material.onBeforeCompile
    material.onBeforeCompile=function(shader){
      compile.call(this,shader);Object.assign(shader.uniforms,uniforms)
      shader.vertexShader='varying vec2 vFloorPosition;\n'+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFloorPosition=position.xy;')
      shader.fragmentShader='uniform float uFloorWet,uFloorTime;varying vec2 vFloorPosition;\n'+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 fp=vFloorPosition;float ripple=sin(length(fp-vec2(1.5,-1.))*48.-uFloorTime*8.)*.00008*uFloorWet;
        ripple+=sin(length(fp-vec2(-2.,2.))*41.-uFloorTime*7.)*.00006*uFloorWet;
        normal=normalize(normal+vec3(dFdx(ripple)*35.,dFdy(ripple)*35.,0.));`)
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.directSpecular *= .008;\nreflectedLight.indirectSpecular *= .04;')
    };material.needsUpdate=true
  },[uniforms])
  useFrame(()=>{const s=state.current;uniforms.uFloorWet.value=s.rain+s.foam;uniforms.uFloorTime.value=s.time;floor.current.roughness=THREE.MathUtils.lerp(.58,.22,Math.min(1,s.rain+s.foam))})
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.015,0]} receiveShadow name="studio-reflection-floor">
    <planeGeometry args={[120,120]}/>
    <MeshReflectorMaterial ref={floor} resolution={768} mirror={.3} blur={[180,70]} mixBlur={.68} mixStrength={1.25} roughness={.58} depthScale={.3} minDepthThreshold={.4} maxDepthThreshold={1.8} color="#0a1117" metalness={.18} envMapIntensity={.04}/>
  </mesh>
}
function Studio({ state,foam }) {
  return <group name={foam?'foam-wash-chamber':'dark-hexagon-studio'}>
    <ambientLight intensity={.14}/>
    <spotLight position={[1,9,-3]} angle={.85} penumbra={.75} intensity={42} castShadow shadow-mapSize={[2048,2048]} shadow-bias={-.00012}/>
    <rectAreaLight position={[-4,3,0]} rotation={[0,-Math.PI/2,0]} width={5} height={2.5} intensity={foam?4.5:2.5} color={foam?'#9fd9ff':'#dbe6ef'}/>
    <rectAreaLight position={[4,3,0]} rotation={[0,Math.PI/2,0]} width={5} height={3} intensity={3.5} color={foam?'#c2b8ff':'#fff1dc'}/>
    <pointLight position={[0,4,6]} color="#c9e5ef" intensity={10} distance={20}/>
    <Floor state={state}/>
    {[[-22,5,0],[22,5,0]].map((p,i)=><mesh key={i} position={p} rotation={[0,Math.PI/2,0]}><planeGeometry args={[48,10]}/><meshStandardMaterial color="#091017" roughness={.85} side={THREE.DoubleSide}/></mesh>)}
    {[-22,22].map(z=><mesh key={z} position={[0,5,z]}><planeGeometry args={[48,10]}/><meshStandardMaterial color="#0a1118" roughness={.85} side={THREE.DoubleSide}/></mesh>)}
    <Hexagons foam={foam}/>
    {foam && <>
      {[-2.1,2.1].map(x=><mesh key={x} position={[x,.004,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.012,16]}/><meshBasicMaterial color={[.5,1.7,2]} toneMapped={false}/></mesh>)}
      {Array.from({length:60},(_,i)=><mesh key={i} position={[2.65,.001,-3+i*.1]}><boxGeometry args={[.45,.012,.019]}/><meshStandardMaterial color="#242e35" metalness={.9} roughness={.32}/></mesh>)}
    </>}
  </group>
}
function Desert() {
  return <group name="sunlit-desert-void">
    <hemisphereLight args={['#f2e2cb','#b49670',2]}/>
    <directionalLight position={SUN_POSITION} color="#fff1d6" intensity={4.6} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-far={80} shadow-normalBias={.018} shadow-bias={-.0001}/>
    <mesh name="desert-ground" rotation={[-Math.PI/2,0,0]} position={[0,-.017,0]} receiveShadow>
      <planeGeometry args={[2000,2000]}/><meshStandardMaterial color="#c9b18b" roughness={.92}/>
    </mesh>
  </group>
}
function Environments({ chapter,state }) {
  const { scene,gl }=useThree()
  useEffect(()=>{
    scene.background=new THREE.Color(chapter===2?'#d4bc98':'#080e15')
    scene.fog=chapter===2?new THREE.FogExp2('#d4bc98',.035):new THREE.Fog('#080e15',25,75)
    gl.shadowMap.needsUpdate=true
  },[chapter,scene,gl])
  return <>
    {chapter===2?<Desert/>:<Studio state={state} foam={chapter===1}/>}
    <Environment key={chapter} frames={1} resolution={256} files={chapter===2?undefined:'/environment/studio.hdr'} environmentIntensity={chapter===2?.85:.42}>
      {chapter===2?<>
        <mesh><sphereGeometry args={[90,32,16]}/><shaderMaterial side={THREE.BackSide}
          vertexShader={`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
          fragmentShader={`varying vec3 vDirection;void main(){float elevation=normalize(vDirection).y;vec3 light=mix(vec3(.32,.23,.14),vec3(1.9,1.85,1.75),smoothstep(-.15,.65,elevation));gl_FragColor=vec4(light,1.);}`}/></mesh>
        <Lightformer position={SUN_POSITION} scale={4} intensity={8} color="#fff0d6" target={[0,0,0]}/>
        <Lightformer position={[-5,6,-4]} scale={[7,5]} intensity={2} color="#fff7e7" target={[0,0,0]}/>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1,0]}><planeGeometry args={[200,200]}/><meshBasicMaterial color="#b5a17e"/></mesh>
      </>:<>
        <Hexagons capture foam={chapter===1}/>
        <Lightformer position={[-5,3,0]} rotation={[0,Math.PI/2,0]} scale={[2,7]} intensity={1.7} color="#d8e8f2"/>
        <Lightformer position={[5,3,0]} rotation={[0,-Math.PI/2,0]} scale={[2,6]} intensity={1.5} color={chapter===1?'#c7bdff':'#fff0dc'}/>
      </>}
    </Environment>
  </>
}
export default memo(Environments)
