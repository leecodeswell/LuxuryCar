import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SHOTS, chapterAt,shotAt,rainfallAt,precipitationAt,foamAt,sprayAt,rinseAt,rinseSprayAt,floorRinseAt,cameraDriftAt } from './cinematography.js'
import {createLightingDirector,advanceLighting} from './lighting.js'
import Car from './Car.jsx'
import Environments from './Environments.jsx'
import { Rain,GroundImpacts,Atmosphere,SoapSpray,GroundLather } from './Weather.jsx'
import Effects from './Effects.jsx'

function Director({ progress,reducedMotion,state }) {
  const {camera,size}=useThree(),shown=useRef(progress.current)
  const target=useMemo(()=>new THREE.Vector3(),[]),targetVector=useMemo(()=>new THREE.Vector3(),[])
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.1)
    shown.current=reducedMotion?progress.current:THREE.MathUtils.damp(shown.current,progress.current,4,dt)
    const chapter=chapterAt(shown.current),shot=shotAt(chapter.local,size.width/size.height,chapter.shots),s=state.current
    s.chapter=chapter.index;s.local=chapter.local;s.progress=shown.current
    const applied=chapter.id==='foam'?foamAt(chapter.local):chapter.id==='rinse'?1:0
    s.rinse=chapter.id==='rinse'?rinseAt(chapter.local):0
    s.floorRinse=chapter.id==='rinse'?floorRinseAt(chapter.local):0
    s.applied=applied
    const foamTarget=applied*(1-s.rinse)
    const rainTarget=chapter.id==='studio'?rainfallAt(chapter.local):1-foamTarget*.25
    s.rain=reducedMotion?rainTarget:THREE.MathUtils.damp(s.rain,rainTarget,3.5,dt)
    const rainCurtain=precipitationAt(shown.current)
    s.precipitation=reducedMotion?rainCurtain:THREE.MathUtils.damp(s.precipitation??0,rainCurtain,4,dt)
    s.foam=reducedMotion?foamTarget:THREE.MathUtils.damp(s.foam,foamTarget,5,dt)
    s.spray=chapter.id==='foam'?sprayAt(chapter.local):0
    s.rinseSpray=chapter.id==='rinse'?rinseSprayAt(chapter.local):0
    s.time+=reducedMotion?0:dt
    Object.assign(s,advanceLighting(s.lighting??=createLightingDirector(shown.current),shown.current,dt,reducedMotion))
    camera.position.fromArray(shot.position);target.fromArray(shot.target)
    if(!reducedMotion){const drift=cameraDriftAt(s.time);camera.position.add(targetVector.fromArray(drift));target.add(targetVector)}
    camera.lookAt(target);camera.rotateZ(shot.roll)
    camera.fov=shot.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld()
  },-1)
  return null
}
function Experience({ progress,reducedMotion,onReady }) {
  const state=useRef({chapter:0,local:0,progress:0,rain:0,precipitation:0,foam:0,applied:0,rinse:0,floorRinse:0,rinseSpray:0,spray:0,time:0,gain:1,blackout:0,exposure:1,lighting:createLightingDirector(progress.current)})
  const {scene,camera,gl}=useThree()
  if(import.meta.env.DEV)window.__AUREL_SCENE__={scene,camera,gl,state}
  return <>
    <Suspense fallback={null}>
      <Environments state={state}/>
      <Car state={state} onReady={onReady}/>
      <Rain state={state}/><GroundImpacts state={state}/><Atmosphere state={state}/><SoapSpray state={state}/><SoapSpray state={state} rinse/><SoapSpray state={state} rinse floorSide={1}/><SoapSpray state={state} rinse floorSide={-1}/><GroundLather state={state}/>
    </Suspense>
    <Director progress={progress} reducedMotion={reducedMotion} state={state}/>
    <Effects state={state}/>
  </>
}
export default function Scene({progress,reducedMotion,onReady,onUnavailable}) {
  return <Canvas
    shadows dpr={[1,1.5]}
    camera={{position:SHOTS[0].position,fov:SHOTS[0].fov,near:.05,far:500}}
    gl={{antialias:false,alpha:false,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:.95}}
    onCreated={({gl})=>{
      gl.transmissionResolutionScale=.35;gl.shadowMap.type=THREE.VSMShadowMap;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true
      gl.info.autoReset=false
      gl.domElement.addEventListener('webglcontextlost',onUnavailable)
    }}
    fallback={<div className="webgl-fallback">Enable WebGL to enter the studio.</div>}
  ><Experience progress={progress} reducedMotion={reducedMotion} onReady={onReady}/></Canvas>
}
