import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SHOTS, chapterAt,cutFadeAt,shotAt,rainfallAt } from './cinematography.js'
import Car from './Car.jsx'
import Environments from './Environments.jsx'
import { Rain,GroundImpacts,Atmosphere } from './Weather.jsx'
import Effects from './Effects.jsx'

function Director({ progress,reducedMotion,state,onChapter }) {
  const {camera,size}=useThree(),shown=useRef(progress.current),lastChapter=useRef(-1)
  const target=useMemo(()=>new THREE.Vector3(),[])
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.1)
    shown.current=reducedMotion?progress.current:THREE.MathUtils.damp(shown.current,progress.current,4,dt)
    const chapter=chapterAt(shown.current),shot=shotAt(chapter.local,size.width/size.height,chapter.shots),s=state.current
    s.chapter=chapter.index;s.local=chapter.local;s.progress=shown.current;s.cut=cutFadeAt(shown.current)
    const rainTarget=chapter.index===0?rainfallAt(chapter.local):0,foamTarget=chapter.index===2?1:0
    s.rain=reducedMotion?rainTarget:THREE.MathUtils.damp(s.rain,rainTarget,3.5,dt)
    s.foam=reducedMotion?foamTarget:THREE.MathUtils.damp(s.foam,foamTarget,5,dt)
    s.time+=reducedMotion?0:dt
    if(lastChapter.current!==chapter.index){lastChapter.current=chapter.index;onChapter(chapter.index)}
    camera.position.fromArray(shot.position);camera.lookAt(target.fromArray(shot.target));camera.rotateZ(shot.roll)
    camera.fov=shot.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld()
  },-1)
  return null
}
function Experience({ progress,reducedMotion,onReady }) {
  const [chapter,setChapter]=useState(chapterAt(progress.current).index)
  const state=useRef({chapter,local:0,progress:0,rain:0,foam:0,time:0,cut:0})
  const {scene,camera,gl}=useThree()
  if(import.meta.env.DEV)window.__AUREL_SCENE__={scene,camera,gl,state}
  return <>
    <Suspense fallback={null}>
      <Environments chapter={chapter} state={state}/>
      <Car state={state} onReady={onReady}/>
      <Rain state={state}/><GroundImpacts state={state}/><Atmosphere state={state}/>
    </Suspense>
    <Director progress={progress} reducedMotion={reducedMotion} state={state} onChapter={setChapter}/>
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
