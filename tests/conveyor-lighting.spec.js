import {test,expect} from '@playwright/test'

test('3D conveyor stays lit through the wash and the opening reflection uses softer light',async({page})=>{
  test.setTimeout(900000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text()))errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:90000})
  async function at(progress,name){
    await page.evaluate(p=>scrollTo(0,(document.querySelector('.story-track').offsetHeight-innerHeight)*p),progress)
    await page.waitForFunction(p=>Math.abs(window.__AUREL_SCENE__.state.current.progress-p)<.0001,progress)
    await page.screenshot({path:`/tmp/luxurycar-${name}.png`})
    expect(await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2');return {lost:gl.isContextLost(),error:gl.getError()}})).toEqual({lost:false,error:0})
  }
  await at(0,'soft-opener')
  const opening=await page.evaluate(()=>{const s=window.__AUREL_SCENE__.scene;return {magenta:s.getObjectByName('spot-magenta').intensity,cyan:s.getObjectByName('spot-cyan').intensity,fill:s.getObjectByName('intro-cyan-softbox').intensity,reflection:s.getObjectByName('studio-reflection-floor').material.mixStrength}})
  expect(opening.magenta).toBeLessThan(400);expect(opening.cyan).toBeLessThan(500)
  expect(opening.fill).toBeGreaterThan(0);expect(opening.reflection).toBeGreaterThan(1.8)
  await at(.12,'side-pan-lighting')
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('spot-magenta').intensity)).toBeGreaterThan(opening.magenta*4)
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.scene.getObjectByName('intro-cyan-softbox').intensity)).toBe(0)
  let identity
  for(const [progress,name] of [[.7,'foam-conveyor-3d'],[.94,'rinse-conveyor-3d'],[1,'finish-conveyor-3d']]){
    await at(progress,name)
    const rig=await page.evaluate(()=>{const g=window.__AUREL_SCENE__.scene.getObjectByName('wash-conveyor');return {uuid:g.uuid,visible:g.visible,solid:g.children.every(m=>m.isInstancedMesh&&m.geometry.type!=='PlaneGeometry'),rails:g.getObjectByName('conveyor-rail-diffusers').geometry.type,slats:g.getObjectByName('conveyor-belt-slats').count}})
    expect(rig.visible).toBe(true);expect(rig.solid).toBe(true);expect(rig.rails).toBe('CapsuleGeometry');expect(rig.slats).toBe(164)
    identity??=rig.uuid;expect(rig.uuid).toBe(identity)
  }
  expect(errors).toEqual([])
})
