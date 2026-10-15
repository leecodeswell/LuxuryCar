import * as THREE from 'three'
import {Octree} from 'three/addons/math/Octree.js'

// Trace short gravity paths against the actual body once, rather than sliding
// particles through a guessed car-shaped box. No raycasts run in the frame loop.
export function createWaterRunners(body,sample,rng,material,count=256) {
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
    paths.push({curve:new THREE.CatmullRomCurve3(points,false,'centripetal'),normals,phase:rng(),speed:.05+rng()*.05,radius:.0025+rng()*.0035})
  }
  const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),material,paths.length)
  mesh.name='running-water-droplets';mesh.frustumCulled=false;mesh.visible=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.userData.surfacePaths=paths.map(path=>path.curve.points.map(point=>point.toArray()))
  return {mesh,paths,dummy:new THREE.Object3D(),position:new THREE.Vector3(),tangent:new THREE.Vector3(),normal:new THREE.Vector3(),right:new THREE.Vector3(),basis:new THREE.Matrix4()}
}
export function updateWaterRunners(runners,time,wet,foam) {
  const {mesh,paths,dummy,position,tangent,normal,right,basis}=runners
  mesh.visible=wet>.02 && foam<.95;mesh.material.opacity=wet*(1-foam)*.96
  if(!mesh.visible)return
  paths.forEach((path,i)=>{
    const t=(time*path.speed+path.phase)%1,scaled=t*(path.normals.length-1),index=Math.min(path.normals.length-2,Math.floor(scaled))
    path.curve.getPoint(t,position);path.curve.getTangent(t,tangent)
    normal.copy(path.normals[index]).lerp(path.normals[index+1],scaled-index).normalize()
    tangent.addScaledVector(normal,-tangent.dot(normal)).normalize();right.crossVectors(normal,tangent).normalize()
    basis.makeBasis(right,normal,tangent);dummy.quaternion.setFromRotationMatrix(basis);dummy.position.copy(position)
    const fade=Math.min(1,t*14,(1-t)*14),r=path.radius*Math.max(0,fade)
    dummy.scale.set(r*.8,r*.5,r*2.6);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate=true
}
