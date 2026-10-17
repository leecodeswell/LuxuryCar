import {test,expect} from '@playwright/test'
test.use({viewport:{width:1100,height:700}})

test('hero paint bubbles update the existing material and retain the choice through the wash',async({page})=>{
  test.setTimeout(360000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|Feedback loop|Framebuffer is incomplete/i.test(m.text()))errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:120000})
  await expect(page.getByRole('group',{name:'Paint color'})).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(5)
  await expect(page.getByRole('radio',{name:'Graphite'})).toBeChecked()
  const identity=await page.evaluate(()=>{
    const scene=window.__AUREL_SCENE__.scene,body=scene.getObjectByName('body')
    return [body.material.uuid,body.geometry.uuid,scene.getObjectByName('surface-water').uuid]
  })
  const colorIs=hex=>page.waitForFunction(color=>window.__AUREL_SCENE__.scene.getObjectByName('body').material.color.getHexString()===color,hex)
  await page.getByRole('radio',{name:'Rosso'}).check();await colorIs('b81120')
  await page.getByRole('radio',{name:'Rosso'}).focus();await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio',{name:'Pearl'})).toBeChecked();await colorIs('dedbd2')
  await page.getByRole('radio',{name:'Cobalt'}).check();await colorIs('175abe')
  await expect(page.locator('.paint-picker output')).toHaveText('Cobalt')
  await page.screenshot({path:'/tmp/aurel-paint-picker-cobalt.png'})
  for(const progress of [.5,.76,1,0]){
    await page.evaluate(p=>scrollTo(0,(document.querySelector('.story-track').offsetHeight-innerHeight)*p),progress)
    await page.waitForFunction(p=>Math.abs(window.__AUREL_SCENE__.state.current.progress-p)<.0001,progress)
    await colorIs('175abe')
  }
  await expect(page.getByRole('radio',{name:'Cobalt'})).toBeChecked()
  expect(await page.evaluate(()=>{
    const scene=window.__AUREL_SCENE__.scene,body=scene.getObjectByName('body')
    return [body.material.uuid,body.geometry.uuid,scene.getObjectByName('surface-water').uuid]
  })).toEqual(identity)
  expect(errors).toEqual([])
})
