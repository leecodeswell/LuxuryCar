import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SHOTS, chapterAt,shotAt,precipitationAt,foamAt,sprayAt,rinseAt,rinseSprayAt,floorRinseAt,cameraDriftAt } from './cinematography.js'
import {createWeatherReveal,advanceWeatherReveal,MIST_DENSITY} from './weather-reveal.js'
import {createLightingDirector,advanceLighting} from './lighting.js'
import {strobeAt,strobeFlashAt,mistClearAt,conveyorAt} from './stage-lighting.js'
import Spotlights from './Spotlights.jsx'
import Car from './Car.jsx'
import Environments from './Environments.jsx'
import { Rain,GroundImpacts,Atmosphere,SoapSpray,GroundLather } from './Weather.jsx'
import Effects from './Effects.jsx'
import HeroTitle from './HeroTitle.jsx'

function Director({ progress,displayed,reducedMotion,state }) {
  const {camera,size}=useThree(),shown=useRef(progress.current)
  const target=useMemo(()=>new THREE.Vector3(),[]),targetVector=useMemo(()=>new THREE.Vector3(),[])
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.1)
    shown.current=reducedMotion?progress.current:THREE.MathUtils.damp(shown.current,progress.current,4,dt)
    const chapter=chapterAt(shown.current),shot=shotAt(chapter.local,size.width/size.height,chapter.shots),s=state.current
    s.chapter=chapter.index;s.local=chapter.local;s.progress=shown.current
    if(displayed)displayed.current=shown.current
    const applied=chapter.id==='foam'?foamAt(chapter.local):chapter.id==='rinse'?1:0
    s.rinse=chapter.id==='rinse'?rinseAt(chapter.local):0
    s.floorRinse=chapter.id==='rinse'?floorRinseAt(chapter.local):0
    s.applied=applied
    s.time+=reducedMotion?0:dt
    Object.assign(s,advanceLighting(s.lighting??=createLightingDirector(shown.current),shown.current,dt,reducedMotion))
    const revealed=advanceWeatherReveal(s.weatherReveal,shown.current,s.blackout,reducedMotion)
    // Pre-wash strobe: hard flashes over a near-black room while the mist burns off.
    s.strobe=strobeAt(shown.current);s.conveyor=conveyorAt(shown.current)
    s.flash=reducedMotion?0:strobeFlashAt(s.time)*s.strobe
    s.gain*=reducedMotion?1-.45*s.strobe:THREE.MathUtils.lerp(1,s.flash?2.3:.04,s.strobe)
    s.mist=(chapter.index===0?revealed*(1-mistClearAt(shown.current)):0)*MIST_DENSITY
    const foamTarget=applied*(1-s.rinse)
    const rainTarget=chapter.id==='studio'?revealed:1-foamTarget*.25
    s.rain=reducedMotion || chapter.index===0?rainTarget:THREE.MathUtils.damp(s.rain,rainTarget,3.5,dt)
    const rainCurtain=chapter.index===0?revealed:precipitationAt(shown.current)
    s.precipitation=reducedMotion || chapter.index===0?rainCurtain:THREE.MathUtils.damp(s.precipitation??0,rainCurtain,4,dt)
    s.foam=reducedMotion?foamTarget:THREE.MathUtils.damp(s.foam,foamTarget,5,dt)
    s.spray=chapter.id==='foam'?sprayAt(chapter.local):0
    s.rinseSpray=chapter.id==='rinse'?rinseSprayAt(chapter.local):0
    camera.position.fromArray(shot.position);target.fromArray(shot.target)
    if(!reducedMotion){const drift=cameraDriftAt(s.time);camera.position.add(targetVector.fromArray(drift));target.add(targetVector)}
    camera.lookAt(target);camera.rotateZ(shot.roll)
    camera.fov=shot.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld()
  },-1)
  return null
}
function Experience({ progress,displayed,reducedMotion,onReady }) {
  const state=useRef({chapter:0,local:0,progress:0,rain:0,precipitation:0,mist:0,weatherReveal:createWeatherReveal(progress.current),foam:0,applied:0,rinse:0,floorRinse:0,rinseSpray:0,spray:0,time:0,gain:1,blackout:0,exposure:1,strobe:0,flash:0,conveyor:0,lighting:createLightingDirector(progress.current)})
  const {scene,camera,gl}=useThree()
  if(import.meta.env.DEV)window.__AUREL_SCENE__={scene,camera,gl,state}
  return <>
    <Suspense fallback={null}>
      <Environments state={state}/>
      <Car state={state} onReady={onReady}/>
      <HeroTitle state={state} reducedMotion={reducedMotion}/>
      <Rain state={state}/><GroundImpacts state={state}/><Atmosphere state={state}/><SoapSpray state={state}/><SoapSpray state={state} rinse/><SoapSpray state={state} rinse floorSide={1}/><SoapSpray state={state} rinse floorSide={-1}/><GroundLather state={state}/>
      <Spotlights state={state}/>
    </Suspense>
    <Director progress={progress} displayed={displayed} reducedMotion={reducedMotion} state={state}/>
    <Effects state={state}/>
  </>
}
export default function Scene({progress,displayed,active=true,reducedMotion,onReady,onUnavailable}) {
  // Rendering pauses once the pinned story has scrolled out of view.
  return <Canvas
    frameloop={active?'always':'never'}
    shadows dpr={[1,1.5]}
    camera={{position:SHOTS[0].position,fov:SHOTS[0].fov,near:.05,far:500}}
    gl={{antialias:false,alpha:false,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:.95}}
    onCreated={({gl})=>{
      gl.transmissionResolutionScale=.35;gl.shadowMap.type=THREE.VSMShadowMap;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true
      gl.info.autoReset=false
      gl.domElement.addEventListener('webglcontextlost',onUnavailable)
    }}
    fallback={<div className="webgl-fallback">Enable WebGL to enter the studio.</div>}
  ><Experience progress={progress} displayed={displayed} reducedMotion={reducedMotion} onReady={onReady}/></Canvas>
}
