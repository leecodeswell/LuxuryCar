import {test,expect} from '@playwright/test'
test.use({viewport:{width:1000,height:700}})

test('hero lettering shares car depth and disappears after the opening',async({page})=>{
  test.setTimeout(360000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text()))errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:120000})
  await page.waitForFunction(()=>window.__AUREL_SCENE__.scene.getObjectByName('hero-title')?.visible)
  await expect(page.locator('.hero-wordmark')).toHaveCSS('visibility','hidden')
  await page.screenshot({path:'/tmp/aurel-title-behind-car.png'})
  const probe=await page.evaluate(()=>{
    const {scene,camera}=window.__AUREL_SCENE__,title=scene.getObjectByName('hero-title')
    // A tiny opaque test patch at the hood provides a clear raster check of
    // occlusion, independent of how much the opening letters overlap the car.
    const p=camera.position.clone().set(.25,.65,-1.5).project(camera)
    const x=Math.round((p.x*.5+.5)*innerWidth),y=Math.round((.5-p.y*.5)*innerHeight)
    const canvas=title.material.map.image,ctx=canvas.getContext('2d'),ratio=canvas.width/innerWidth
    const left=Math.round((x-10)*ratio),top=Math.round((y-10)*ratio),side=Math.ceil(20*ratio)
    window.__TITLE_PROBE__={data:ctx.getImageData(left,top,side,side),left,top}
    ctx.resetTransform();ctx.fillStyle='white';ctx.fillRect(left,top,side,side)
    title.material.map.needsUpdate=true
    return {x,y,depthTest:title.material.depthTest,depthWrite:title.material.depthWrite,layer:title.layers.mask}
  })
  expect(probe).toMatchObject({depthTest:true,depthWrite:false,layer:2})
  const clip={x:probe.x-8,y:probe.y-8,width:16,height:16}
  const behind=await page.screenshot({clip})
  await page.evaluate(()=>{window.__AUREL_SCENE__.scene.getObjectByName('hero-title').material.depthTest=false})
  const overlaid=await page.screenshot({clip})
  expect(behind.equals(overlaid),'the hood must cover the title only when depth testing is enabled').toBe(false)
  await page.evaluate(()=>{
    const title=window.__AUREL_SCENE__.scene.getObjectByName('hero-title'),probe=window.__TITLE_PROBE__
    title.material.map.image.getContext('2d').putImageData(probe.data,probe.left,probe.top)
    title.material.map.needsUpdate=true;title.material.depthTest=true
    scrollTo(0,document.querySelector('.story-track').offsetHeight-innerHeight)
  })
  await page.waitForFunction(()=>window.__AUREL_SCENE__.state.current.progress===1&&!window.__AUREL_SCENE__.scene.getObjectByName('hero-title').visible)
  expect(await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2');return {lost:gl.isContextLost(),error:gl.getError()}})).toEqual({lost:false,error:0})
  expect(errors).toEqual([])
})
