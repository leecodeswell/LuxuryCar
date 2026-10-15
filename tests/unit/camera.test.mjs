import test from 'node:test'
import assert from 'node:assert/strict'
import { CHAPTERS,SHOTS,SUN_SHOTS,FOAM_SHOTS,chapterAt,cutFadeAt,shotAt,rainfallAt } from '../../src/cinematography.js'

test('original studio keeps the straight side passes and makes the rear view much wider',()=>{
  for(const p of [.2,.35,.79,.95]){
    const shot=shotAt(p)
    assert.equal(shot.position[1],shot.target[1]);assert.equal(shot.position[2],shot.target[2])
    assert(shot.position[0]>shot.target[0])
  }
  const rear=shotAt(.55)
  assert.equal(rear.position[2],15.5);assert(rear.position[1]>2)
  assert.equal(rainfallAt(.55),0);assert.equal(rainfallAt(.65),1)
})
test('each chapter stays outside the body and clear of the floor',()=>{
  for(const chapter of CHAPTERS)for(let i=0;i<=1000;i++){
    const shot=shotAt(i/1000,16/9,chapter.shots)
    assert(shot.position.every(Number.isFinite));assert(shot.position[1]>=.79)
    assert(Math.hypot(shot.position[0],shot.position[2])>2.5)
    assert(Math.hypot(...shot.position.map((v,j)=>v-shot.target[j]))>2.4)
    assert(shot.fov>=30 && shot.fov<=42);assert(Math.abs(shot.roll)<.05)
  }
})
test('sunlight and foam camera flight has continuous positions and velocities',()=>{
  const h=1e-5
  for(const shots of [SUN_SHOTS,FOAM_SHOTS])for(const {p} of shots.slice(1,-1)){
    const a=shotAt(p-h,16/9,shots).position,b=shotAt(p,16/9,shots).position,c=shotAt(p+h,16/9,shots).position
    for(let j=0;j<3;j++){assert(Math.abs(a[j]-c[j])<.01);assert(Math.abs((b[j]-a[j])/h-(c[j]-b[j])/h)<.02)}
  }
})
test('new chapters establish their setting and hold the final product composition',()=>{
  for(const shots of [SUN_SHOTS,FOAM_SHOTS]){
    assert.deepEqual(shotAt(0,16/9,shots),shotAt(.05,16/9,shots))
    assert.deepEqual(shotAt(.93,16/9,shots),shotAt(1,16/9,shots))
    const h=1e-5
    for(const p of [.06,.92]){
      const a=shotAt(p-h,16/9,shots).position,b=shotAt(p+h,16/9,shots).position
      for(let j=0;j<3;j++)assert(Math.abs((b[j]-a[j])/(2*h))<.01)
    }
  }
})
test('chapter boundaries are covered by a short reversible fade',()=>{
  assert.equal(chapterAt(0).shots,SHOTS);assert.equal(chapterAt(.5).id,'sunlight');assert.equal(chapterAt(.9).id,'foam')
  assert.equal(chapterAt(1).local,1)
  for(const boundary of [.44,.72]){assert.equal(cutFadeAt(boundary),1);assert.equal(cutFadeAt(boundary-.02),0);assert.equal(cutFadeAt(boundary+.02),0)}
})
