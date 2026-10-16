import {test,expect} from '@playwright/test'
async function scrollTo(page,p){
  await page.evaluate(v=>window.scrollTo({top:(document.querySelector('.story-track').offsetHeight-innerHeight)*v,behavior:'instant'}),p)
  await page.waitForFunction(v=>Math.abs(window.__AUREL_SCENE__?.state.current.progress-v)<.0001,p)
}
async function healthy(page){
  expect(await page.locator('canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2');return {lost:gl.isContextLost(),error:gl.getError()}})).toEqual({lost:false,error:0})
}
// Measure the rendered scene only: the site header and story overlay sit above the canvas.
async function capture(page,name){
  await page.evaluate(()=>document.documentElement.classList.add('capture-scene'))
  try{return await page.locator('canvas').screenshot({path:`/tmp/aurel-desktop-${name}.png`})}
  finally{await page.evaluate(()=>document.documentElement.classList.remove('capture-scene'))}
}
async function camera(page){return page.evaluate(()=>window.__AUREL_SCENE__.camera.position.toArray())}
async function identities(page){return page.evaluate(()=>{const s=window.__AUREL_SCENE__.scene;return ['hero-car','studio-reflection-floor','hexagon-lighting','layered-rain-mist'].map(name=>s.getObjectByName(name).uuid).concat(s.environment.uuid)})}
async function freezeLighting(page,age){
  await page.evaluate(age=>{Object.defineProperty(window.__AUREL_SCENE__.state.current.lighting,'age',{configurable:true,get:()=>age,set:()=>{}})},age)
  await page.evaluate(async()=>{for(let i=0;i<3;i++)await new Promise(requestAnimationFrame)})
}
async function imageStats(page,png){return page.evaluate(async bytes=>{
  const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height
  const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data
  let max=0,total=0;for(let i=0;i<data.length;i+=4){max=Math.max(max,data[i],data[i+1],data[i+2]);total+=data[i]+data[i+1]+data[i+2]}
  bitmap.close();return {max,mean:total/(c.width*c.height*3)}
},Array.from(png))}

test('continuous wet-to-foam studio, surface water, strobe-cleared mist, and authored light failure',async({page})=>{
  test.setTimeout(1200000)
  const errors=[],external=[],roomHDR=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning' && /GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text())))errors.push(m.text())})
  page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith('http://127.0.0.1:3000'))external.push(r.url());if(r.url().includes('/environment/studio.hdr'))roomHDR.push(r.url())})
  await page.goto('/')
  await page.addStyleTag({content:'.capture-scene .story-ui,.capture-scene .site-header{visibility:hidden!important}'})
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:90000})
  await page.waitForFunction(()=>window.__AUREL_SCENE__?.gl.info.render.triangles>100000)
  // The pinned studio itself stays free of video and controls; site copy lives in the overlay and sections.
  await expect(page.locator('video,.stage button,.stage nav')).toHaveCount(0)
  expect(await page.locator('.stage').evaluate(stage=>{const copy=stage.cloneNode(true);copy.querySelectorAll('canvas').forEach(c=>c.remove());return copy.textContent.trim()})).toBe('')
  expect(errors).toEqual([])
  const traced=await page.evaluate(()=>{
    const s=window.__AUREL_SCENE__,contact=s.state.current.spraySweep,origin=s.camera.position.clone(),point=origin.clone(),normal=origin.clone(),misses=[]
    for(const reverse of [false,true])for(let i=0;i<=100;i++){
      if(!contact.trace(i/100,reverse,origin,point,normal)||!contact.bounds.clone().expandByScalar(.001).containsPoint(point)||Math.abs(normal.length()-1)>.0001)misses.push([reverse,i])
    }
    return misses
  })
  expect(traced).toEqual([])
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.spraySweep.width)).toBeGreaterThan(2.7)
  const original=await identities(page)
  const setup=await page.evaluate(()=>{
    const scene=window.__AUREL_SCENE__.scene,runner=scene.getObjectByName('running-water-droplets')
    return {ledType:scene.getObjectByName('hexagon-lighting').geometry.type,ledCount:scene.getObjectByName('hexagon-lighting').count,
      meshes:scene.getObjectByName('dark-hexagon-studio').children.filter(o=>o.isMesh).map(o=>o.name),
      beads:scene.getObjectByName('surface-water').count,runners:runner.count,
      descending:runner.userData.surfacePaths.every(path=>path.at(-1)[1]<path[0][1]),
      groundFoam:!!scene.getObjectByName('foam-runoff-pools')||!!scene.getObjectByName('ground-lather'),
      desert:!!scene.getObjectByName('sunlit-desert-void'),floatingBubbles:!!scene.getObjectByName('soap-film-bubbles')}
  })
  expect(setup.ledType).toBe('CylinderGeometry');expect(setup.ledCount).toBe(126)
  expect(setup.meshes).toEqual(['studio-reflection-floor'])
  expect(setup.beads).toBe(12000);expect(setup.runners).toBeGreaterThan(96);expect(setup.descending).toBe(true)
  expect(setup.groundFoam).toBe(true);expect(setup.desert).toBe(false);expect(setup.floatingBubbles).toBe(false)
  await scrollTo(page,.54*.6);await capture(page,'wide-rear')
  const before=await page.evaluate(()=>Array.from(window.__AUREL_SCENE__.scene.getObjectByName('running-water-droplets').instanceMatrix.array.slice(0,32)))
  await scrollTo(page,.384-.0001)
  await page.emulateMedia({reducedMotion:'no-preference'})
  await freezeLighting(page,.14)
  await scrollTo(page,.384+.00005)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.progress>=.384)
  expect(await page.evaluate(()=>{const s=window.__AUREL_SCENE__.state.current;return [s.rain,s.precipitation,s.mist]})).toEqual([0,0,0])
  // Freeze only the authored event clock to inspect its complete recovery envelope.
  await freezeLighting(page,.35)
  const dark=await capture(page,'lighting-blackout'),blackStats=await imageStats(page,dark)
  expect(blackStats.max).toBe(0)
  expect(await page.evaluate(()=>{const s=window.__AUREL_SCENE__.state.current;return [s.rain,s.precipitation,s.mist]})).toEqual([1,1,1.7])
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('hexagon-lighting').material.emissiveIntensity)).toBe(0)
  await freezeLighting(page,.64)
  const bright=await imageStats(page,await capture(page,'lighting-overcorrection'))
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('studio-key-light').intensity)).toBeCloseTo(294)
  await freezeLighting(page,1.04)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.gain)).toBeCloseTo(.2)
  await freezeLighting(page,2)
  const settled=await imageStats(page,await capture(page,'lighting-settled'))
  expect(bright.mean).toBeGreaterThan(settled.mean*1.2)
  await page.evaluate(()=>Object.defineProperty(window.__AUREL_SCENE__.state.current.lighting,'age',{configurable:true,writable:true,value:Infinity}))
  const time=await page.evaluate(()=>window.__AUREL_SCENE__.state.current.time)
  await page.waitForFunction(t=>window.__AUREL_SCENE__.state.current.time>t+.3,time)
  expect(await page.evaluate(()=>Array.from(window.__AUREL_SCENE__.scene.getObjectByName('running-water-droplets').instanceMatrix.array.slice(0,32)))).not.toEqual(before)
  await page.emulateMedia({reducedMotion:'reduce'})
  await scrollTo(page,.78*.6)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('layered-rain-mist').material.uniforms.uDensity.value)).toBeGreaterThan(.8)
  await capture(page,'rain-approach')
  await scrollTo(page,.95*.6)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('surface-water').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('running-water-droplets').visible)).toBe(true)
  await capture(page,'rain-detail');await healthy(page)
  // Pre-wash strobe: the conveyor floor glows and the mist burns off.
  await scrollTo(page,.58)
  expect(await page.evaluate(()=>{const s=window.__AUREL_SCENE__;return {strobe:s.state.current.strobe,conveyor:s.scene.getObjectByName('wash-conveyor').visible,mist:s.state.current.mist}})).toMatchObject({strobe:1,conveyor:true})
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.mist)).toBeLessThan(1.7)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('hidden-color-spotlights').children.filter(o=>o.isMesh).length)).toBe(0)
  await scrollTo(page,.6-.00001);const joinBefore=await camera(page)
  await scrollTo(page,.6+.00001);const joinAfter=await camera(page)
  expect(Math.hypot(...joinBefore.map((v,i)=>v-joinAfter[i]))).toBeLessThan(.005)
  expect(await identities(page)).toEqual(original)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.blackout)).toBe(0)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('layered-rain-mist').material.uniforms.uDensity.value)).toBe(0)
  await scrollTo(page,.68)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('spot-magenta').intensity)).toBeGreaterThan(100)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.spray)).toBeGreaterThan(.99)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('offscreen-soap-spray').visible)).toBe(true)
  await capture(page,'soap-spraying')
  await scrollTo(page,.81)
  const finish=await page.evaluate(()=>{const s=window.__AUREL_SCENE__;return {chapter:s.state.current.chapter,foam:s.state.current.foam,mist:s.scene.getObjectByName('layered-rain-mist').material.uniforms.uDensity.value,froth:s.scene.getObjectByName('foam-microbubbles').count,spray:s.scene.getObjectByName('offscreen-soap-spray').visible}})
  expect(finish).toEqual({chapter:1,foam:1,mist:0,froth:18000,spray:false})
  expect(await identities(page)).toEqual(original)
  await capture(page,'heavy-foam');await healthy(page)
  await scrollTo(page,.82-.00001);const rinseBefore=await camera(page)
  await scrollTo(page,.82+.00001);const rinseAfter=await camera(page)
  expect(Math.hypot(...rinseBefore.map((v,i)=>v-rinseAfter[i]))).toBeLessThan(.005)
  await scrollTo(page,.91)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('offscreen-rinse-spray').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.rinse)).toBeGreaterThan(.4)
  await capture(page,'rinsing')
  const contact=await page.evaluate(()=>{const s=window.__AUREL_SCENE__,pose=s.state.current.sprayPose,jet=s.scene.getObjectByName('offscreen-rinse-spray').children[0].material.uniforms;return {valid:pose.valid,distance:jet.uHit.value.distanceTo(pose.point),normal:jet.uNormal.value.dot(pose.normal)}})
  expect(contact.valid).toBe(true);expect(contact.distance).toBeLessThan(.025);expect(contact.normal).toBeGreaterThan(.999)
  await scrollTo(page,.955)
  expect(await page.evaluate(()=>{const s=window.__AUREL_SCENE__;return {body:s.state.current.rinse,floor:s.state.current.floorRinse,groundVisible:s.scene.getObjectByName('ground-lather').visible,bodySpray:s.scene.getObjectByName('offscreen-rinse-spray').visible,floorSprays:[1,-1].every(i=>s.scene.getObjectByName(`floor-rinse-${i}`).visible)}})).toMatchObject({body:1,groundVisible:true,bodySpray:false,floorSprays:true})
  await capture(page,'floor-wash')
  await scrollTo(page,1)
  expect(await page.evaluate(()=>{const s=window.__AUREL_SCENE__;return {chapter:s.state.current.chapter,foam:s.state.current.foam,rinse:s.state.current.rinse,wet:s.state.current.rain,mist:s.scene.getObjectByName('layered-rain-mist').material.uniforms.uDensity.value,runners:s.scene.getObjectByName('running-water-droplets').visible,froth:s.scene.getObjectByName('foam-microbubbles').visible,spray:s.scene.getObjectByName('offscreen-rinse-spray').visible}})).toEqual({chapter:2,foam:0,rinse:1,wet:1,mist:0,runners:true,froth:false,spray:false})
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('ground-lather').visible)).toBe(false)
  expect(await identities(page)).toEqual(original)
  await capture(page,'rinsed-hero');await healthy(page)
  await scrollTo(page,.81)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.foam)).toBe(1)

  await scrollTo(page,.57)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.foam)).toBe(0)
  expect(await identities(page)).toEqual(original)
  await healthy(page)
  expect(errors).toEqual([]);expect(external).toEqual([]);expect(roomHDR).toEqual([])
})
