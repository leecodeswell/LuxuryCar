import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SPOTLIGHTS, spotlightAt } from './stage-lighting.js'

// Four hidden colour spotlights. The lights stay in the scene at zero intensity
// so their cues never change the light count (and never recompile shaders).
export default function Spotlights({state}) {
  const rig=useMemo(()=>{
    const group=new THREE.Group();group.name='hidden-color-spotlights'
    const lights=SPOTLIGHTS.map(spec=>{
      const light=new THREE.SpotLight(spec.color,0,0,.5,.6,2)
      light.name=spec.name;light.position.fromArray(spec.position)
      light.target.position.fromArray(spec.target);light.userData.spec=spec
      group.add(light,light.target)
      return light
    })
    return {group,lights}
  },[])
  useEffect(()=>()=>rig.lights.forEach(light=>light.dispose()),[rig])
  useFrame(()=>{
    const s=state.current
    for(const light of rig.lights){
      const spec=light.userData.spec,level=spotlightAt(spec,s.progress)*(1-s.blackout)
      light.intensity=spec.intensity*level
      // A slow sweep across the body keeps the colour moving while held.
      light.target.position.set(spec.target[0]+Math.sin(s.time*.35+spec.position[0])*.45,spec.target[1],spec.target[2]+Math.cos(s.time*.28+spec.position[2])*.6)
    }
  })
  return <primitive object={rig.group}/>
}
