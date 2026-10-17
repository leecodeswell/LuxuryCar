import {readFile,writeFile,copyFile,mkdtemp,rm} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import path from 'node:path'
import * as THREE from 'three'
import {MeshSurfaceSampler} from 'three/addons/math/MeshSurfaceSampler.js'
import {seededRandom} from '../src/surface-materials.js'
import {traceWaterPaths} from './lib/trace-water-paths.mjs'

const root=new URL('../public/',import.meta.url),file=await readFile(new URL('models/ferrari.glb',root))
const jsonLength=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+jsonLength)),binary=file.subarray(28+jsonLength)
const temp=await mkdtemp(path.join(tmpdir(),'aurel-draco-'))
let geometry
try {
  const wrapper=path.join(temp,'decoder.cjs')
  await copyFile(new URL('draco/draco_wasm_wrapper.js',root),wrapper)
  const factory=createRequire(import.meta.url)(wrapper)
  const draco=await factory({wasmBinary:await readFile(new URL('draco/draco_decoder.wasm',root))})
  const node=gltf.nodes.find(n=>n.name==='body'),primitive=gltf.meshes[node.mesh].primitives[0]
  const ext=primitive.extensions.KHR_draco_mesh_compression,view=gltf.bufferViews[ext.bufferView]
  const data=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength)
  const decoder=new draco.Decoder(),buffer=new draco.DecoderBuffer(),mesh=new draco.Mesh()
  buffer.Init(new Int8Array(data),data.length)
  const status=decoder.DecodeBufferToMesh(buffer,mesh)
  if(!status.ok())throw new Error(status.error_msg())
  geometry=new THREE.BufferGeometry()
  for(const [name,key] of [['POSITION','position'],['NORMAL','normal']]){
    const values=new draco.DracoFloat32Array(),attribute=decoder.GetAttributeByUniqueId(mesh,ext.attributes[name])
    decoder.GetAttributeFloatForAllPoints(mesh,attribute,values)
    const array=Float32Array.from({length:values.size()},(_,i)=>values.GetValue(i))
    geometry.setAttribute(key,new THREE.BufferAttribute(array,3));draco.destroy(values)
  }
  const face=new draco.DracoInt32Array(),indices=new Uint32Array(mesh.num_faces()*3)
  for(let i=0;i<mesh.num_faces();i++){decoder.GetFaceFromMesh(mesh,i,face);for(let k=0;k<3;k++)indices[i*3+k]=face.GetValue(k)}
  geometry.setIndex(new THREE.BufferAttribute(indices,1))
  for(const object of [face,mesh,buffer,decoder])draco.destroy(object)
} finally {await rm(temp,{recursive:true,force:true})}

const nodes=gltf.nodes.map(node=>{
  const object=node.name==='body'?new THREE.Mesh(geometry):new THREE.Object3D()
  object.name=node.name||''
  if(node.matrix)object.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix))
  else {
    if(node.translation)object.position.fromArray(node.translation)
    if(node.rotation)object.quaternion.fromArray(node.rotation)
    if(node.scale)object.scale.fromArray(node.scale)
  }
  return object
})
gltf.nodes.forEach((node,i)=>(node.children||[]).forEach(child=>nodes[i].add(nodes[child])))
const scene=new THREE.Group()
gltf.scenes[gltf.scene||0].nodes.forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true)
const body=scene.getObjectByName('body'),random=seededRandom(458)
let draws=0
const rng=()=>{draws++;return random()}
const sampler=new MeshSurfaceSampler(body).setRandomGenerator(rng).build()
const point=new THREE.Vector3(),normal=new THREE.Vector3(),matrix=new THREE.Matrix3().getNormalMatrix(body.matrixWorld)
function sample(){
  for(let retry=0;retry<60;retry++){
    sampler.sample(point,normal);point.applyMatrix4(body.matrixWorld);normal.applyNormalMatrix(matrix)
    if(normal.y>-.1)break
  }
  return {point:point.clone(),normal:normal.clone()}
}
// Match the existing droplet random stream, including its deposit/radius draws.
for(let i=0;i<12000;i++)rng()
for(let i=0;i<12000;i++){sample();rng()}
const before=draws,paths=traceWaterPaths(body,sample,rng)
const bytes=44+paths.reduce((sum,p)=>sum+16+p.points.length*12,0),output=Buffer.alloc(bytes)
output.write('AWR1');output.writeUInt16LE(paths.length,4);output.writeUInt32LE(draws-before,8)
createHash('sha256').update(file).digest().copy(output,12)
let offset=44
for(const p of paths){
  output.writeUInt8(p.points.length,offset)
  output.writeFloatLE(p.phase,offset+4);output.writeFloatLE(p.speed,offset+8);output.writeFloatLE(p.radius,offset+12);offset+=16
  p.points.forEach((point,i)=>{
    for(const v of point.toArray()) {output.writeInt16LE(Math.round(v*10000),offset);offset+=2}
    for(const v of p.normals[i].toArray()) {output.writeInt16LE(Math.round(v*32767),offset);offset+=2}
  })
}
await writeFile(new URL('models/water-runners.bin',root),output)
console.log(`Baked ${paths.length} paths into ${bytes.toLocaleString()} bytes; ${draws-before} random draws preserved.`)
