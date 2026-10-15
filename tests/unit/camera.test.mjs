import test from 'node:test'
import assert from 'node:assert/strict'
import {CHAPTERS,SHOTS,chapterAt,cutFadeAt,shotAt,rainfallAt,foamAt,sprayAt,cameraDriftAt,studioPulseAt} from '../../src/cinematography.js'
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))

test('studio retains straight horizontal side tracks and a wide moving rear arc',()=>{
  for(const p of [.15,.25,.87,.95]){
    const shot=shotAt(p)
    assert.equal(shot.position[1],shot.target[1]);assert.equal(shot.position[2],shot.target[2])
    assert(shot.position[0]>shot.target[0])
  }
  const a=shotAt(.54),b=shotAt(.64)
  assert(a.position[2]>=16);assert(b.position[2]>=15)
  assert(a.position[1]>3);assert(b.position[1]>3)
  assert(distance(a.position,b.position)>2)
})
test('rain and mist build during the inward camera move, after the wide rear arc',()=>{
  assert.equal(rainfallAt(.64),0);assert.equal(rainfallAt(.8),1)
  let previous=Infinity
  for(let i=0;i<=20;i++){
    const p=.64+i*.16/20,shot=shotAt(p),d=distance(shot.position,shot.target)
    assert(d<previous);previous=d
    if(i>0)assert(rainfallAt(p)>rainfallAt(p-.008))
  }
})
test('each chapter stays outside the body and clear of the floor',()=>{
  for(const chapter of CHAPTERS)for(let i=0;i<=1000;i++){
    const shot=shotAt(i/1000,16/9,chapter.shots)
    assert(shot.position.every(Number.isFinite));assert(shot.position[1]>=.79)
    assert(Math.hypot(shot.position[0],shot.position[2])>2.5)
    assert(distance(shot.position,shot.target)>2.4)
    assert(shot.fov>=30 && shot.fov<=42);assert(Math.abs(shot.roll)<.05)
  }
})
test('every camera path has continuous velocity and no stationary scroll intervals',()=>{
  const h=1e-5
  for(const {shots} of CHAPTERS){
    for(const {p} of shots.slice(1,-1)){
      const a=shotAt(p-h,16/9,shots).position,b=shotAt(p,16/9,shots).position,c=shotAt(p+h,16/9,shots).position
      for(let j=0;j<3;j++)assert(Math.abs((b[j]-a[j])/h-(c[j]-b[j])/h)<.25)
    }
    for(let i=0;i<1000;i++){
      const p=i/1000,a=shotAt(p,16/9,shots),b=shotAt(p+h,16/9,shots)
      assert(distance(a.position,b.position)/h>.1,`stationary ${shots===SHOTS?'studio':'chapter'} at ${p}`)
    }
  }
})
test('idle camera translation is subtle, continuous, and keeps moving',()=>{
  for(let t=0;t<180;t+=.1){
    const a=cameraDriftAt(t),b=cameraDriftAt(t+.001)
    assert(Math.hypot(...a)<.11);assert(distance(a,b)/.001>.001)
  }
})
test('studio light pulses are occasional and smoothly bounded',()=>{
  assert.equal(studioPulseAt(0),0);assert.equal(studioPulseAt(10),0)
  assert.equal(studioPulseAt(5.4),1);assert(Math.abs(studioPulseAt(6.35)-.55)<1e-10)
  let active=0
  for(let i=0;i<1550;i++){const t=i/100,v=studioPulseAt(t);assert(v>=0 && v<=1);if(v>0)active++;assert(Math.abs(v-studioPulseAt(t+15.5))<1e-10)}
  assert(active<130)
})
test('chapter cuts reverse cleanly and soap precedes the desert finale',()=>{
  assert.deepEqual(CHAPTERS.map(c=>c.id),['studio','foam','sunlight'])
  assert.equal(chapterAt(0).shots,SHOTS);assert.equal(chapterAt(.5).id,'foam');assert.equal(chapterAt(.9).id,'sunlight')
  assert.equal(chapterAt(1).local,1)
  for(const boundary of [.44,.72]){assert.equal(cutFadeAt(boundary),1);assert.equal(cutFadeAt(boundary-.02),0);assert.equal(cutFadeAt(boundary+.02),0)}
  assert.equal(foamAt(0),0);assert.equal(sprayAt(0),0)
  assert.equal(foamAt(.08),0);assert(sprayAt(.08)>.99)
  assert(foamAt(.35)>0 && foamAt(.35)<1);assert.equal(sprayAt(.35),1)
  assert.equal(foamAt(.8),1);assert.equal(sprayAt(.8),0)
})
