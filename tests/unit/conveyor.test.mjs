import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createConveyor} from '../../src/conveyor.js'
import {conveyorAt} from '../../src/stage-lighting.js'

test('conveyor uses solid raised fixtures, moves its slats, and remains on through both wash phases',()=>{
  const rig=createConveyor(),box=new THREE.Box3(),matrix=new THREE.Matrix4()
  try{
    for(const progress of [.57,.6,.7,.81,.82,.95,1]){
      rig.update(0,conveyorAt(progress))
      assert.equal(rig.group.visible,true)
    }
    assert(rig.group.children.every(mesh=>mesh.isInstancedMesh && mesh.geometry.type!=='PlaneGeometry'))
    const rail=rig.group.getObjectByName('conveyor-rail-diffusers')
    assert.equal(rail.geometry.type,'CapsuleGeometry');assert.equal(rail.count,2)
    rail.getMatrixAt(0,matrix);box.copy(rail.geometry.boundingBox??(rail.geometry.computeBoundingBox(),rail.geometry.boundingBox)).applyMatrix4(matrix)
    assert(box.max.y-box.min.y>.05);assert(box.max.z-box.min.z>17)
    const slats=rig.group.getObjectByName('conveyor-belt-slats'),before=Array.from(slats.instanceMatrix.array)
    rig.update(.5,1);assert.notDeepEqual(Array.from(slats.instanceMatrix.array),before)
    rig.update(.5,1,1);assert.equal(rig.uniforms.uConveyorGlow.value,0)
    rig.update(.5,conveyorAt(.2));assert.equal(rig.group.visible,false)
  }finally{rig.dispose()}
})
