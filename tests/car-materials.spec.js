import {test,expect} from '@playwright/test'
test.use({viewport:{width:900,height:600}})

test('enamel badges, lamp optics and layered finishes survive the wet and wash passes',async({page})=>{
  test.setTimeout(900000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text()))errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:120000})
  const materials=await page.evaluate(()=>{
    const model=window.__AUREL_SCENE__.scene.getObjectByName('hero-car')
    const badge=model.getObjectByName('yellow_trim'),tail=model.getObjectByName('lights_red'),body=model.getObjectByName('body')
    const uv=badge.geometry.attributes.uv.array
    return {uvRange:Math.max(...uv)-Math.min(...uv),badge:badge.material.name,badgeSpace:badge.material.map.colorSpace,paintNormal:!!body.material.normalMap,lens:tail.material[0].name,tailGroups:tail.geometry.groups.length,brakes:model.getObjectByName('brakes').material.name}
  })
  expect(materials).toMatchObject({badge:'printed enamel badges',badgeSpace:'srgb',paintNormal:true,lens:'ribbed red polycarbonate',brakes:'red painted brake caliper',tailGroups:3})
  expect(materials.uvRange).toBeGreaterThan(.8)
  for(const [progress,name] of [[0,'opener'],[.14,'side'],[.3,'rear'],[.5,'wet'],[.76,'foam'],[1,'rinsed']]){
    await page.evaluate(p=>scrollTo(0,(document.querySelector('.story-track').offsetHeight-innerHeight)*p),progress)
    await page.waitForFunction(p=>Math.abs(window.__AUREL_SCENE__.state.current.progress-p)<.0001,progress)
    await page.screenshot({path:`/tmp/car-materials-${name}.png`})
    expect(await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2');return {lost:gl.isContextLost(),error:gl.getError()}})).toEqual({lost:false,error:0})
  }
  // Inspection-only cameras. The production Director and paths are unchanged.
  await page.evaluate(()=>{
    scrollTo(0,0)
    const camera=window.__AUREL_SCENE__.camera,from=camera.position.fromArray,look=camera.lookAt
    window.__CAR_DETAIL__={position:[1.27,.88,-.75],target:[.914,.738,-.803]}
    camera.position.fromArray=function(){return from.call(this,window.__CAR_DETAIL__.position)}
    camera.lookAt=function(){return look.call(this,...window.__CAR_DETAIL__.target)}
  })
  await page.screenshot({path:'/tmp/car-detail-shield.png'})
  await page.evaluate(()=>{window.__CAR_DETAIL__={position:[1.15,1.03,2.7],target:[.768,.875,2.04]}})
  await page.screenshot({path:'/tmp/car-detail-tail.png'})
  expect(errors).toEqual([])
})
