import test from 'node:test'
import assert from 'node:assert/strict'
import {strobeAt,mistClearAt,conveyorAt,strobeFlashAt,SPOTLIGHTS,spotlightAt} from '../../src/stage-lighting.js'

test('the strobe runs right before the wash and the mist is gone when foam starts',()=>{
  assert.equal(strobeAt(.5),0);assert.equal(strobeAt(.57),1);assert(strobeAt(.6)<1e-6)
  assert.equal(mistClearAt(.55),0);assert.equal(mistClearAt(.6),1)
  assert.equal(conveyorAt(.5),0);assert.equal(conveyorAt(.57),1);assert.equal(conveyorAt(.7),0)
  const flashes=Array.from({length:150},(_,i)=>strobeFlashAt(i/150*2))
  assert(flashes.includes(0)&&flashes.includes(1))
})
test('four hidden spotlights cue around, never during, the rain blackout and strobe',()=>{
  assert.equal(SPOTLIGHTS.length,4)
  for(const spot of SPOTLIGHTS){
    assert.equal(spotlightAt(spot,.384),0)
    for(const p of [.55,.57,.59])assert.equal(spotlightAt(spot,p),0)
    assert.equal(spotlightAt(spot,1),1)
  }
  assert.equal(spotlightAt(SPOTLIGHTS[0],0),1)
})
