import {test,expect} from '@playwright/test'
test.use({viewport:{width:800,height:550}})

test('reverse optics and solid LED guides render dry, under foam and after rinse',async({page})=>{
  test.setTimeout(300000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text()))errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:120000})
  const optics=await page.evaluate(()=>{
    const {scene,camera}=window.__AUREL_SCENE__,chrome=scene.getObjectByName('chrome')
    const from=camera.position.fromArray,look=camera.lookAt
    camera.position.fromArray=function(){return from.call(this,[1.15,1.03,2.7])}
    camera.lookAt=function(){return look.call(this,.768,.875,2.04)}
    return {reverse:chrome.material[1].name,faces:chrome.geometry.groups[1].count,guides:['left','right'].map(side=>scene.getObjectByName(`tail-light-guide-${side}`).geometry.type)}
  })
  expect(optics.reverse).toBe('clear reverse lamp optics');expect(optics.faces).toBeGreaterThan(1000)
  expect(optics.guides).toEqual(['TorusGeometry','TorusGeometry'])
  for(const [progress,name] of [[0,'dry'],[.76,'foam'],[1,'rinsed']]){
    await page.evaluate(p=>scrollTo(0,(document.querySelector('.story-track').offsetHeight-innerHeight)*p),progress)
    await page.waitForFunction(p=>Math.abs(window.__AUREL_SCENE__.state.current.progress-p)<.0001,progress)
    await page.screenshot({path:`/tmp/car-optics-${name}.png`})
    expect(await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2');return {lost:gl.isContextLost(),error:gl.getError()}})).toEqual({lost:false,error:0})
  }
  expect(errors).toEqual([])
})
