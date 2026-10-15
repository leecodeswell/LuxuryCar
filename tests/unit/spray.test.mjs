import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createSpraySweep} from '../../src/spray-contact.js'
import {floorRinseAt,rinseAt,rinseSprayAt} from '../../src/cinematography.js'

test('wide spray sweep stays continuous across a cabin opening and spans the body',()=>{
  const body=new THREE.Mesh(new THREE.BoxGeometry(2,1,4));body.position.y=.5;body.updateMatrixWorld(true)
  const sweep=createSpraySweep(body),origin=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3()
  assert(sweep.width>2.7)
  const path=()=>Array.from({length:1001},(_,i)=>{
    sweep.trace(i/1000,false,origin,point,normal)
    assert(point.toArray().every(Number.isFinite));assert.equal(point.x,0)
    assert(Math.abs(normal.length()-1)<1e-6)
    return point.clone()
  })
  const before=path()
  // An open cockpit or differently tessellated panels must not alter the rig.
  body.geometry.dispose();body.geometry=new THREE.PlaneGeometry(.1,.1)
  const after=path()
  for(let i=0;i<before.length;i++){
    assert(before[i].equals(after[i]))
    if(i)assert(before[i].distanceTo(before[i-1])<.006)
    sweep.trace(i/1000,true,origin,point,normal)
    assert(point.distanceTo(before[1000-i])<1e-8)
  }
  body.geometry.dispose();body.material.dispose()
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
