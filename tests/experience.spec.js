import { test,expect } from '@playwright/test'
import { createHash } from 'node:crypto'
async function scrollTo(page,p){
  await page.evaluate(v=>window.scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*v,behavior:'instant'}),p)
  await page.waitForFunction(v=>Math.abs(window.__AUREL_SCENE__?.state.current.progress-v)<.001,p)
}
async function camera(page){return page.evaluate(()=>{
  const c=window.__AUREL_SCENE__.camera,e=c.matrixWorld.elements
  return {position:c.position.toArray(),direction:[-e[8],-e[9],-e[10]]}
})}
async function noInterface(page){
  expect(await page.locator('main').evaluate(main=>{const copy=main.cloneNode(true);copy.querySelectorAll('canvas').forEach(c=>c.remove());return copy.textContent.trim()})).toBe('')
  await expect(page.locator('video,button,nav,header,footer,h1')).toHaveCount(0)
}
async function capture(page,name){const data=await page.screenshot({path:`/tmp/aurel-desktop-${name}.png`});return createHash('sha256').update(data).digest('hex')}
async function healthyWebGL(page){
  expect(await page.locator('canvas').evaluate(canvas=>{
    const gl=canvas.getContext('webgl2')
    return {lost:gl.isContextLost(),error:gl.getError()}
  })).toEqual({lost:false,error:0})
}

test('desktop live 3D plays all three chapters, improved rain, foam, and reverse transitions',async({page})=>{
  test.setTimeout(480000)
  const errors=[],external=[],media=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning' && /GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text())))errors.push(m.text())})
  page.on('request',r=>{if(r.url().startsWith('http') && !r.url().startsWith('http://127.0.0.1:3000'))external.push(r.url());if(/\.(mp4|webm)/.test(r.url()))media.push(r.url())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:90000})
  await page.waitForFunction(()=>window.__AUREL_SCENE__?.gl.info.render.triangles>100000)
  await noInterface(page)
  await healthyWebGL(page)
  expect(await page.evaluate(()=>{
    const fixtures=window.__AUREL_SCENE__.scene.getObjectByName('hexagon-lighting')
    return {count:fixtures.count,heights:Array.from({length:fixtures.count},(_,i)=>fixtures.instanceMatrix.array[i*16+13])}
  })).toEqual({count:21,heights:Array(21).fill(5.5)})
  const overview=await capture(page,'overview')
  await scrollTo(page,.2*.44)
  const front=await camera(page);expect(front.direction[0]).toBeCloseTo(-1,5)
  await scrollTo(page,.35*.44)
  const back=await camera(page);expect(back.position[2]).toBeGreaterThan(front.position[2]);expect(back.direction).toEqual(front.direction)
  await scrollTo(page,.55*.44)
  const rear=await camera(page);expect(rear.position[2]).toBeCloseTo(15.5,2);expect(rear.position[1]).toBeGreaterThan(2)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('surface-water').visible)).toBe(false)
  await capture(page,'wide-rear')
  await scrollTo(page,.95*.44)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.rain>.96)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('surface-water').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('rain-impacts').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('rainfall').material.uniforms.uWet.value)).toBeCloseTo(1)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('layered-rain-mist').material.uniforms.uDensity.value)).toBeCloseTo(1)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('rain-impact-splashes').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('layered-rain-mist').visible)).toBe(true)
  const rain=await capture(page,'rain-detail');expect(rain).not.toBe(overview)
  const fixed=await camera(page)
  await page.mouse.move(400,350);await page.mouse.down();await page.mouse.move(700,450,{steps:5});await page.mouse.up()
  expect(await camera(page)).toEqual(fixed)
  await page.emulateMedia({reducedMotion:'no-preference'})
  const time=await page.evaluate(()=>window.__AUREL_SCENE__.state.current.time)
  await page.waitForFunction(t=>window.__AUREL_SCENE__.state.current.time>t+.2,time)
  const clocks=await page.evaluate(()=>{const s=window.__AUREL_SCENE__;return {scene:s.state.current.time,rain:s.scene.getObjectByName('rainfall').material.uniforms.uTime.value}})
  expect(clocks.rain).toBeGreaterThan(.2);expect(clocks.rain).toBeCloseTo(clocks.scene,6)
  expect(await capture(page,'rain-moving')).not.toBe(rain)
  ;(await camera(page)).position.forEach((value,index)=>expect(value).toBeCloseTo(fixed.position[index],6))
  await page.emulateMedia({reducedMotion:'reduce'})
  await healthyWebGL(page)
  await scrollTo(page,.445)
  await page.waitForFunction(()=>Boolean(window.__AUREL_SCENE__.scene.getObjectByName('foam-wash-chamber')))
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.foam)).toBe(0)
  await scrollTo(page,.53)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.spray>.99)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('offscreen-soap-spray').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('soap-spray-droplets').material.uniforms.uSpray.value)).toBeCloseTo(1)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('soap-spray-fan').material.uniforms.uSpray.value)).toBeCloseTo(1)
  const partial=await page.evaluate(()=>window.__AUREL_SCENE__.state.current.foam)
  expect(partial).toBeGreaterThan(.1);expect(partial).toBeLessThan(.8)
  await capture(page,'soap-spraying')
  await healthyWebGL(page)
  await scrollTo(page,.67)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.foam>.98)
  const foam=await capture(page,'foam-detail');expect(foam).not.toBe(rain)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('foam-microbubbles').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('foam-runoff-pools').visible)).toBe(true)
  expect(await page.evaluate(()=>Boolean(window.__AUREL_SCENE__.scene.getObjectByName('soap-film-bubbles')))).toBe(false)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('offscreen-soap-spray').visible)).toBe(false)
  await healthyWebGL(page)
  await scrollTo(page,.84)
  await page.waitForFunction(()=>Boolean(window.__AUREL_SCENE__.scene.getObjectByName('sunlit-desert-void')) && window.__AUREL_SCENE__.state.current.foam<.015)
  const sun=await capture(page,'sunlight');expect(sun).not.toBe(foam)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('sunlit-desert-void').children.filter(o=>o.isMesh).length)).toBe(1)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('sunlit-dust').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('foam-runoff-pools').visible)).toBe(false)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('layered-rain-mist').visible)).toBe(false)
  await healthyWebGL(page)
  // Revisit the spray halfway through, then rewind to the still-wet uncoated car.
  await scrollTo(page,.53)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.spray>.99 && Boolean(window.__AUREL_SCENE__.scene.getObjectByName('foam-wash-chamber')))
  await healthyWebGL(page)
  await scrollTo(page,.445)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.foam===0)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('foam-runoff-pools').visible)).toBe(false)
  await scrollTo(page,0)
  await page.waitForFunction(()=>Boolean(window.__AUREL_SCENE__.scene.getObjectByName('dark-hexagon-studio')))
  await noInterface(page)
  await healthyWebGL(page)
  expect(errors).toEqual([]);expect(external).toEqual([]);expect(media).toEqual([])
})
