import * as THREE from 'three'
// A broad wash curtain follows a smooth envelope of the car, not individual
// panels. Window/cabin openings cannot pull the jet sideways or down inside.
export function createSpraySweep(body) {
  const bounds=new THREE.Box3().setFromObject(body),width=bounds.max.x-bounds.min.x
  return {bounds,width:width*1.4,trace(progress,reverse,origin,point,outNormal){
    const t=THREE.MathUtils.clamp(reverse?1-progress:progress,0,1)
    const z=THREE.MathUtils.lerp(bounds.min.z+.045,bounds.max.z-.045,t)
    const height=THREE.MathUtils.lerp(.5,.93,Math.sin(Math.PI*t)**2)
    point.set(0,height,z);origin.set(5.8,5.2,z-.8)
    outNormal.set(.45,.9,0).normalize()
    return true
  }}
}

export const floorWashGLSL=`
  uniform float uFloorRinse,uFoam;
  float floorSoapAt(vec3 p){
    float depositFront=mix(-3.5,3.6,uFoam);
    float deposit=(1.-smoothstep(depositFront-.3,depositFront+.3,p.z))*smoothstep(0.,.06,uFoam);
    float washFront=mix(-3.8,3.8,uFloorRinse);
    float edge=.07*sin(p.x*19.)+.045*sin(p.z*31.+p.x*8.);
    float remaining=smoothstep(washFront-.24,washFront+.24,p.z+edge);
    return deposit*remaining*(1.-smoothstep(.98,1.,uFloorRinse));
  }
`
