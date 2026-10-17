import * as THREE from 'three'
import {Octree} from 'three/addons/math/Octree.js'

// Build-time only. The browser reads these surface-conforming paths instead
// of constructing an octree and tracing thousands of rays during startup.
export function traceWaterPaths(body,sample,rng,count=256) {
  const tree=new Octree().fromGraphNode(body),bounds=new THREE.Box3().setFromObject(body)
  const paths=[],ray=new THREE.Ray(),normal=new THREE.Vector3()
  for(let attempt=0;attempt<count*12 && paths.length<count;attempt++){
    const seed=sample()
    if(seed.point.y<.4 || Math.max(Math.abs(seed.normal.x),Math.abs(seed.normal.z))<.6)continue
    const axis=Math.abs(seed.normal.x)>Math.abs(seed.normal.z)?'x':'z',cross=axis==='x'?'z':'x',sign=Math.sign(seed.normal[axis])
    const length=.15+rng()*.25,phase=rng()*6.283185,points=[],normals=[]
    for(let i=0;i<12;i++){
      const t=i/11
      ray.origin.copy(seed.point);ray.origin.y-=length*t;ray.origin[cross]+=Math.sin(t*2+phase)*.008
      ray.origin[axis]=sign>0?bounds.max[axis]+.5:bounds.min[axis]-.5
      ray.direction.set(0,0,0);ray.direction[axis]=-sign
      const hit=tree.rayIntersect(ray)
      if(!hit || hit.position.y<.13)break
      hit.triangle.getNormal(normal)
      if(points.length && hit.position.distanceTo(points.at(-1))>.085)break
      points.push(hit.position.clone().addScaledVector(normal,.0018));normals.push(normal.clone())
    }
    if(points.length<5)continue
    paths.push({points,normals,phase:rng(),speed:.05+rng()*.05,radius:.0025+rng()*.0035})
  }
  return paths
}
