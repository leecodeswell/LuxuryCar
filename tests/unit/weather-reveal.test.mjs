import test from 'node:test'
import assert from 'node:assert/strict'
import {RAIN_REVEAL_PROGRESS,createWeatherReveal,advanceWeatherReveal} from '../../src/weather-reveal.js'
import {LIGHT_CUES,createLightingDirector,advanceLighting} from '../../src/lighting.js'

test('rain and mist change together only under blackout at the original onset',()=>{
  assert.deepEqual(LIGHT_CUES,[.64*.6])
  const p=RAIN_REVEAL_PROGRESS,weather=createWeatherReveal(),lighting=createLightingDirector()
  let light=advanceLighting(lighting,p-1e-5,.016)
  assert.equal(advanceWeatherReveal(weather,p-1e-5,light.blackout),0)
  light=advanceLighting(lighting,p,.016)
  assert.equal(advanceWeatherReveal(weather,p,light.blackout),0)
  // The pre-blackout flicker must still show the dry room.
  for(let i=0;i<18;i++){
    light=advanceLighting(lighting,p,.01)
    assert.equal(advanceWeatherReveal(weather,p,light.blackout),0)
  }
  for(let i=0;i<12;i++){
    light=advanceLighting(lighting,p,.01)
    const wasWet=weather.revealed,value=advanceWeatherReveal(weather,p,light.blackout)
    if(value && !wasWet)assert(light.blackout>=.999)
  }
  assert.equal(weather.revealed,true)
  for(let i=0;i<200;i++){
    light=advanceLighting(lighting,p,.01)
    assert.equal(advanceWeatherReveal(weather,p,light.blackout),1)
  }
  assert.equal(light.gain,1)
})
test('rewind rearms the weather reveal; reduced motion and resumed wet scenes stay deterministic',()=>{
  const p=RAIN_REVEAL_PROGRESS,w=createWeatherReveal()
  assert.equal(advanceWeatherReveal(w,p,.999),1)
  assert.equal(advanceWeatherReveal(w,p-.001,0),0)
  assert.equal(advanceWeatherReveal(w,p,0),0)
  assert.equal(advanceWeatherReveal(w,p,0,true),1)
  assert.equal(advanceWeatherReveal(createWeatherReveal(.5),.5,0),1)
  assert.equal(advanceWeatherReveal(createWeatherReveal(),.7,0),1)
})

test('a short rewind across onset can replay the blackout and reveal',()=>{
  const p=RAIN_REVEAL_PROGRESS,w=createWeatherReveal(),l=createLightingDirector()
  advanceLighting(l,p,.01)
  let light=advanceLighting(l,p,.35)
  assert.equal(advanceWeatherReveal(w,p,light.blackout),1)
  light=advanceLighting(l,p-.0001,.01)
  assert.equal(advanceWeatherReveal(w,p-.0001,light.blackout),0)
  advanceLighting(l,p+.0001,.01)
  assert.equal(l.age,0)
})
