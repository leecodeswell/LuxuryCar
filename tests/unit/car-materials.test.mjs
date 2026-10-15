import {test} from 'node:test'
import assert from 'node:assert/strict'
import {badgeProjection,tailRegion} from '../../src/car-materials.js'

test('hood, fender shields and instrument dial receive different atlas tiles',()=>{
  assert.equal(badgeProjection({x:0,y:.58,z:-2.1},'yellow_trim').tile,0)
  const left=badgeProjection({x:-.92,y:.74,z:-.8},'yellow_trim')
  const right=badgeProjection({x:.92,y:.74,z:-.8},'yellow_trim')
  assert.equal(left.tile,1);assert.equal(right.tile,1)
  assert.equal(left.u+right.u,1)
  assert.equal(badgeProjection({x:-.35,y:.82,z:-.68},'yellow_trim').tile,3)
})
test('light guides illuminate rear lenses and centre brake strip, leaving reflectors unlit',()=>{
  assert.equal(tailRegion({x:.77,y:.87,z:2.04}),'lamp')
  assert.equal(tailRegion({x:-.77,y:.87,z:2.04}),'lamp')
  assert.equal(tailRegion({x:0,y:.94,z:2.13}),'brake-strip')
  assert.equal(tailRegion({x:.59,y:.45,z:2.15}),'reflector')
  assert.equal(tailRegion({x:0,y:.7,z:-.3}),'reflector')
})
