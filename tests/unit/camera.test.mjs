import test from 'node:test'
import assert from 'node:assert/strict'
import {CHAPTERS,SHOTS,chapterAt,shotAt,rainfallAt,precipitationAt,foamAt,sprayAt,cameraDriftAt} from '../../src/cinematography.js'
import {LIGHT_CUES,lightingAt,createLightingDirector,advanceLighting} from '../../src/lighting.js'
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
test('rain joins soap with matching camera position, aim, lens, and global velocity',()=>{
  assert.deepEqual(CHAPTERS.map(c=>c.id),['studio','foam'])
  const h=1e-6
  const at=p=>{const c=chapterAt(p);return shotAt(c.local,16/9,c.shots)}
  const a=at(.6-h),b=at(.6),c=at(.6+h)
  for(const key of ['position','target'])for(let i=0;i<3;i++){
    assert(Math.abs(a[key][i]-c[key][i])<.001)
    assert(Math.abs((b[key][i]-a[key][i])/h-(c[key][i]-b[key][i])/h)<.03)
  }
  assert(Math.abs(a.fov-c.fov)<.001);assert.equal(chapterAt(1).id,'foam')
})
test('soap is progressively applied and stays on through the end',()=>{
  assert.equal(foamAt(0),0);assert.equal(sprayAt(0),0)
  assert.equal(foamAt(.08),0);assert(sprayAt(.08)>.99)
  assert(foamAt(.35)>0 && foamAt(.35)<1);assert.equal(sprayAt(.35),1)
  assert.equal(foamAt(.8),1);assert.equal(sprayAt(.8),0)
})
test('authored lighting failure blacks out, overshoots, dips, and settles',()=>{
  assert.equal(lightingAt(.35).blackout,1);assert.equal(lightingAt(.35).gain,0)
  assert.equal(lightingAt(.64).gain,7);assert(lightingAt(.64).exposure>1.5)
  assert(Math.abs(lightingAt(1.04).gain-.2)<1e-10)
  assert.deepEqual(lightingAt(2),{gain:1,blackout:0,exposure:1})
})
test('lighting triggers once per authored crossing, completes while idle, and rearms on rewind',()=>{
  const director=createLightingDirector()
  advanceLighting(director,LIGHT_CUES[0]-.01,.016)
  advanceLighting(director,LIGHT_CUES[0]+.001,.016)
  assert.equal(director.age,0)
  const dark=advanceLighting(director,LIGHT_CUES[0]+.001,.35)
  assert.equal(dark.blackout,1)
  for(let i=0;i<1000;i++)advanceLighting(director,LIGHT_CUES[0]+.001,.1)
  assert.equal(lightingAt(director.age).gain,1);assert(director.age>90)
  advanceLighting(director,0,.016);advanceLighting(director,LIGHT_CUES[0]+.001,.016);assert.equal(director.age,0)
  assert.deepEqual(advanceLighting(director,.9,.016,true),{gain:1,blackout:0,exposure:1})
  assert.equal(LIGHT_CUES.length,3);assert(!LIGHT_CUES.includes(.6))
})

test('rain curtain fades smoothly into the soap opening without drying the persistent mist',()=>{
  assert.equal(precipitationAt(.6),1);assert.equal(precipitationAt(.67),0)
  assert(Math.abs(precipitationAt(.6-1e-5)-precipitationAt(.6+1e-5))<1e-5)
  assert(precipitationAt(.62)>precipitationAt(.64));assert(precipitationAt(.64)>0)
})
