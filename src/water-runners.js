import * as THREE from 'three'

// Paths are traced against the real mesh at build time. Quantization is 0.1 mm.
export function decodeWaterPaths(buffer) {
  const view=new DataView(buffer)
  if(view.getUint32(0,true)!==0x31525741)throw new Error('Invalid water path asset')
  const count=view.getUint16(4,true),paths=[]
  let offset=44
  for(let i=0;i<count;i++){
    const length=view.getUint8(offset),phase=view.getFloat32(offset+4,true),speed=view.getFloat32(offset+8,true),radius=view.getFloat32(offset+12,true)
    offset+=16
    const points=[],normals=[]
    for(let j=0;j<length;j++){
      points.push(new THREE.Vector3(...[0,2,4].map(n=>view.getInt16(offset+n,true)/10000)))
      normals.push(new THREE.Vector3(...[6,8,10].map(n=>view.getInt16(offset+n,true)/32767)).normalize());offset+=12
    }
    paths.push({curve:new THREE.CatmullRomCurve3(points,false,'centripetal'),normals,phase,speed,radius})
  }
  return {paths,randomDraws:view.getUint32(8,true)}
}
export function createWaterRunners(data,rng,material) {
  const {paths,randomDraws}=decodeWaterPaths(data)
  // Keep foam sampling identical to the original stream after path generation.
  for(let i=0;i<randomDraws;i++)rng()
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
