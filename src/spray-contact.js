import * as THREE from 'three'
import {Octree} from 'three/addons/math/Octree.js'

// The beam and rebound share the first intersection with the actual body.
// A downward probe finds a real panel even at the narrow, sloping nose; the
// nozzle ray then checks for any nearer panel that would intercept the jet.
export function createSprayContact(body) {
  const tree=new Octree().fromGraphNode(body),bounds=new THREE.Box3().setFromObject(body)
  const ray=new THREE.Ray(),probe=new THREE.Vector3(),normal=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0)
  return {bounds,trace(progress,reverse,origin,point,outNormal){
    const z=THREE.MathUtils.lerp(bounds.min.z+.045,bounds.max.z-.045,reverse?1-progress:progress)
    let panel
    const lanes=[.45,.75,.9,.2,0,1.,-.75]
    for(let i=0;i<42 && !panel;i++){
      const inset=Math.floor(i/lanes.length)*.035
      probe.set(lanes[i%lanes.length],bounds.max.y+2,THREE.MathUtils.lerp(z,(bounds.min.z+bounds.max.z)/2,inset))
      ray.set(probe,down);panel=tree.rayIntersect(ray)
    }
    if(!panel)return false
    origin.set(7,5.2,panel.position.z-.8)
    ray.set(origin,normal.subVectors(panel.position,origin).normalize())
    const hit=tree.rayIntersect(ray)
    if(!hit)return false
    point.copy(hit.position);hit.triangle.getNormal(outNormal)
    if(outNormal.dot(ray.direction)>0)outNormal.negate()
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
