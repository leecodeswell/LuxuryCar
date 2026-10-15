import { memo, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
RectAreaLightUniformsLib.init()
const ceiling=[]
for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
  if(Math.abs(row)+Math.abs(col)>3)continue
  ceiling.push([col*2.45+(row%2)*1.225,5.5,row*2.12])
}
function Hexagons({capture=false,state}) {
  const rig=useMemo(()=>{
    const group=new THREE.Group();group.name=capture?'hex-reflection-rig':'suspended-led-fixtures'
    const housingMaterial=new THREE.MeshStandardMaterial({color:'#171c21',metalness:.82,roughness:.32})
    const lightMaterial=new THREE.MeshStandardMaterial({color:'#e9f3fc',emissive:'#dce9ee',emissiveIntensity:capture?1.35:2.6,roughness:.24,toneMapped:false})
    const housing=new THREE.InstancedMesh(new THREE.CylinderGeometry(.067,.067,1,12),housingMaterial,126)
    const diffuser=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.035,1,12),lightMaterial,126)
    const joints=new THREE.InstancedMesh(new THREE.SphereGeometry(.067,10,6),housingMaterial,126)
    const lightJoints=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,10,6),lightMaterial,126)
    const suspension=new THREE.InstancedMesh(new THREE.CylinderGeometry(.004,.004,.8,6),housingMaterial,42)
    housing.name='led-aluminum-housings';diffuser.name=capture?'led-reflection-diffusers':'hexagon-lighting'
    joints.name='led-rounded-corners';lightJoints.name='led-diffuser-corners';suspension.name='led-suspension-cables'
    const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3()
    let index=0,cable=0
    for(const [x,y,z] of ceiling)for(let edge=0;edge<6;edge++){
      const angle=edge*Math.PI/3+Math.PI/6,next=angle+Math.PI/3
      a.set(x+Math.cos(angle)*1.34,y,z+Math.sin(angle)*1.34)
      b.set(x+Math.cos(next)*1.34,y,z+Math.sin(next)*1.34)
      direction.subVectors(b,a)
      dummy.position.copy(a).lerp(b,.5);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set(1,direction.length(),1)
      dummy.updateMatrix();housing.setMatrixAt(index,dummy.matrix)
      dummy.position.y-=.055;dummy.scale.y-=.015;dummy.updateMatrix();diffuser.setMatrixAt(index,dummy.matrix)
      dummy.position.copy(a);dummy.quaternion.identity();dummy.scale.setScalar(1);dummy.updateMatrix();joints.setMatrixAt(index,dummy.matrix)
      dummy.position.y-=.055;dummy.updateMatrix();lightJoints.setMatrixAt(index,dummy.matrix)
      if(edge===0 || edge===3){dummy.position.copy(a);dummy.position.y+=.4;dummy.updateMatrix();suspension.setMatrixAt(cable++,dummy.matrix)}
      index++
    }
    group.add(housing,diffuser,joints,lightJoints,suspension)
    group.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.instanceMatrix.needsUpdate=true})
    return {group,lightMaterial}
  },[capture])
  useFrame(()=>{if(!capture)rig.lightMaterial.emissiveIntensity=2.6*(state?.current.gain??1)})
  useEffect(()=>()=>{
    const materials=new Set();rig.group.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();materials.add(mesh.material)}});materials.forEach(material=>material.dispose())
  },[rig])
  return <primitive object={rig.group}/>
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
// The foam chamber's cyan guide rails and slatted belts, restored as a moving
// conveyor that glows through the pre-wash strobe.
const conveyorStrips=[
  {name:'conveyor-rails',x:0,width:4.26,kind:0},
  {name:'conveyor-belt-left',x:-2.68,width:.5,kind:1},
  {name:'conveyor-belt-right',x:2.68,width:.5,kind:1},
]
function Conveyor({ state }) {
  const group=useRef()
  const uniforms=useMemo(()=>({uTime:{value:0},uGlow:{value:0}}),[])
  useFrame(()=>{
    const s=state.current;uniforms.uTime.value=s.time;uniforms.uGlow.value=s.conveyor
    group.current.visible=s.conveyor>.002
  })
  return <group ref={group} name="wash-conveyor" visible={false}>
    {conveyorStrips.map(strip=><mesh key={strip.name} name={strip.name} position={[strip.x,.006,0]} rotation={[-Math.PI/2,0,0]} renderOrder={2}>
      <planeGeometry args={[strip.width,18]}/>
      <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniforms} onUpdate={material=>{material.uniforms=uniforms}}
        defines={{KIND:strip.kind}}
        vertexShader={`varying vec2 vLocal;void main(){vLocal=vec2((uv.x-.5)*${strip.width.toFixed(2)},(uv.y-.5)*18.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`uniform float uTime,uGlow;varying vec2 vLocal;
          void main(){
            float z=vLocal.y,travel=z+uTime*1.6,ends=1.-smoothstep(5.5,9.,abs(z));
            vec3 cyan=vec3(.35,1.5,2.);float light=0.;
          #if KIND==0
            float rail=exp(-pow((abs(vLocal.x)-2.1)/.008,2.));
            float pulse=pow(.5+.5*sin(travel*2.6),6.);
            float bars=exp(-pow((fract(travel*.42)-.5)/.012,2.))*(1.-smoothstep(1.6,2.1,abs(vLocal.x)));
            light=rail*(1.4+3.*pulse)+bars*.55;
          #else
            float slat=fract(travel*10.);
            float gap=smoothstep(0.,.06,slat)*(1.-smoothstep(.16,.24,slat));
            float edge=exp(-pow((abs(vLocal.x)-.22)/.012,2.));
            light=gap*.9+edge*1.2;
          #endif
            gl_FragColor=vec4(cyan*light*uGlow*ends,1.);
          }`}/>
    </mesh>)}
  </group>
}
function Studio({ state }) {
  const ambient=useRef(),key=useRef(),left=useRef(),right=useRef(),rim=useRef()
  useFrame(()=>{
    const gain=state.current.gain
    ambient.current.intensity=.14*gain;key.current.intensity=42*gain
    left.current.intensity=3.5*gain
    right.current.intensity=3.5*gain;rim.current.intensity=40*gain
  })
  return <group name="dark-hexagon-studio">
    <ambientLight ref={ambient} intensity={.14}/>
    <spotLight name="studio-key-light" ref={key} position={[1,9,-3]} angle={.85} penumbra={.75} intensity={42} castShadow shadow-mapSize={[2048,2048]} shadow-bias={-.00012}/>
    <rectAreaLight ref={left} position={[-4,3,0]} rotation={[0,-Math.PI/2,0]} width={5} height={2.5} intensity={3.5} color="#dbe6ef"/>
    <rectAreaLight ref={right} position={[4,3,0]} rotation={[0,Math.PI/2,0]} width={5} height={3} intensity={3.5} color="#fff1dc"/>
    <pointLight ref={rim} position={[0,4,6]} color="#c9e5ef" intensity={40} distance={20}/>
    <Floor state={state}/>
    <Hexagons state={state}/>
    <Conveyor state={state}/>
  </group>
}
function Environments({state}) {
  const {scene,gl}=useThree()
  useEffect(()=>{
    scene.background=new THREE.Color('#080e15');scene.fog=new THREE.Fog('#080e15',25,75)
    gl.shadowMap.needsUpdate=true
  },[scene,gl])
  useFrame(()=>{scene.environmentIntensity=.42*state.current.gain})
  return <>
    <Studio state={state}/>
    <Environment frames={1} resolution={256} environmentIntensity={.42}>
      <Hexagons capture/>
      <Lightformer form="circle" position={[0,4,7]} scale={[8,3]} intensity={3.5} color="#e3edf5" target={[0,0,0]}/>
      <Lightformer position={[-5,3,0]} rotation={[0,Math.PI/2,0]} scale={[2,7]} intensity={1.7} color="#d8e8f2"/>
      <Lightformer position={[5,3,0]} rotation={[0,-Math.PI/2,0]} scale={[2,6]} intensity={1.5} color="#fff0dc"/>
    </Environment>
  </>
}
export default memo(Environments)
