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
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('hexagon-lighting').count)).toBeGreaterThan(100)
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
  const rain=await capture(page,'rain-detail');expect(rain).not.toBe(overview)
  const fixed=await camera(page)
  await page.mouse.move(400,350);await page.mouse.down();await page.mouse.move(700,450,{steps:5});await page.mouse.up()
  expect(await camera(page)).toEqual(fixed)
  await page.emulateMedia({reducedMotion:'no-preference'})
  const time=await page.evaluate(()=>window.__AUREL_SCENE__.state.current.time)
  await page.waitForFunction(t=>window.__AUREL_SCENE__.state.current.time>t+.2,time)
  expect(await capture(page,'rain-moving')).not.toBe(rain)
  ;(await camera(page)).position.forEach((value,index)=>expect(value).toBeCloseTo(fixed.position[index],6))
  await page.emulateMedia({reducedMotion:'reduce'})
  await healthyWebGL(page)
  await scrollTo(page,.53)
  await page.waitForFunction(()=>Boolean(window.__AUREL_SCENE__.scene.getObjectByName('sunlit-mineral-courtyard')) && window.__AUREL_SCENE__.state.current.rain<.015)
  const sun=await capture(page,'sunlight');expect(sun).not.toBe(rain)
  await healthyWebGL(page)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('sunlit-dust').visible)).toBe(true)
  await scrollTo(page,.84)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.foam>.98 && Boolean(window.__AUREL_SCENE__.scene.getObjectByName('foam-wash-chamber')))
  const foam=await capture(page,'foam-detail');expect(foam).not.toBe(sun)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('foam-microbubbles').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('foam-runoff-pools').visible)).toBe(true)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('soap-film-bubbles').material.iridescence)).toBe(1)
  await scrollTo(page,.98);await capture(page,'foam-hero')
  await healthyWebGL(page)
  // Cross both boundaries in reverse and verify no foam/rain leaks into the sun set.
  await scrollTo(page,.6)
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.foam<.015 && Boolean(window.__AUREL_SCENE__.scene.getObjectByName('sunlit-mineral-courtyard')))
  await page.waitForFunction(()=>!window.__AUREL_SCENE__.scene.getObjectByName('foam-runoff-pools').visible)
  await scrollTo(page,0)
  await page.waitForFunction(()=>Boolean(window.__AUREL_SCENE__.scene.getObjectByName('dark-hexagon-studio')))
  await noInterface(page)
  await healthyWebGL(page)
  expect(errors).toEqual([]);expect(external).toEqual([]);expect(media).toEqual([])
})
