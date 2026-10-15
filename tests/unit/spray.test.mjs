import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createSprayContact} from '../../src/spray-contact.js'
import {floorRinseAt,rinseAt,rinseSprayAt} from '../../src/cinematography.js'

test('spray contacts follow a tapered sloping nose instead of an assumed height',()=>{
  // Narrow front, wider rear, and a low hood reproduce the reported failure.
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -.3,.28,-2,1,1,2,.3,.28,-2, -1,1,2,1,1,2,-.3,.28,-2,
  ],3));geometry.computeVertexNormals()
  const mesh=new THREE.Mesh(geometry);mesh.updateMatrixWorld(true)
  const contact=createSprayContact(mesh),origin=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3(),raycaster=new THREE.Raycaster()
  for(const reverse of [false,true])for(let i=0;i<=100;i++){
    assert(contact.trace(i/100,reverse,origin,point,normal))
    raycaster.set(origin,point.clone().sub(origin).normalize())
    const hit=raycaster.intersectObject(mesh)[0]
    assert(hit);assert(hit.point.distanceTo(point)<1e-5)
    assert(normal.dot(raycaster.ray.direction)<0)
    if((reverse?1-i/100:i/100)<.08)assert(point.y<.45,'nose splash must stay down on the hood')
  }
  geometry.dispose();mesh.material.dispose()
})
test('body rinse finishes before floor wash, with spray present throughout clearing',()=>{
  assert.equal(rinseAt(.56),1);assert.equal(floorRinseAt(.62),0)
  let last=0
  for(let i=0;i<=100;i++){
    const p=i/100,value=floorRinseAt(p)
    assert(value>=last)
    if(value>last)assert(rinseSprayAt(p)>.7)
    last=value
  }
  assert.equal(floorRinseAt(1),1)
})
