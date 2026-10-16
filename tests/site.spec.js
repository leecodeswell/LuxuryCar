import {test,expect} from '@playwright/test'

async function story(page,p){
  await page.evaluate(v=>scrollTo(0,(document.querySelector('.story-track').offsetHeight-innerHeight)*v),p)
  await page.waitForFunction(v=>Math.abs(window.__AUREL_SCENE__.state.current.progress-v)<.0001,p)
}

test('pinned story UI tracks the animation stages, then the site sections take over',async({page})=>{
  test.setTimeout(600000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:120000})
  await expect(page.locator('.site-header .wordmark')).toHaveText('AUREL')
  await expect(page.locator('.site-header .cta')).toHaveAttribute('href','#book')
  await expect(page.locator('.stage-rail li')).toHaveCount(8)
  await expect(page.locator('.site-nav')).toHaveAttribute('aria-hidden','true')
  await expect(page.locator('.hero-wordmark')).toHaveText('AUREL')
  await expect(page.locator('.hero-wordmark')).toHaveCSS('opacity','1')
  for(const [p,id,gloss] of [[0,'arrival','38'],[.45,'rain',null],[.7,'foam',null],[.9,'rinse',null],[1,'delivery','96']]){
    await story(page,p)
    await expect(page.locator('.story-ui')).toHaveAttribute('data-stage',id)
    await expect(page.locator('.stage-rail .is-active a')).toHaveAttribute('href',`#stage-${id}`)
    await expect(page.locator(`#stage-${id}`)).toHaveClass(/is-active/)
    if(gloss)await expect(page.locator('.gauge-value > span')).toHaveText(gloss)
  }
  await expect(page.locator('.hero-wordmark')).toHaveCSS('opacity','0')
  // The pinned scene stays put while the story plays.
  expect(await page.locator('.experience').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBe(0)
  await page.locator('#services').scrollIntoViewIfNeeded()
  await expect(page.locator('.site-header')).toHaveClass(/is-solid/)
  await expect(page.locator('.site-nav')).toHaveAttribute('aria-hidden','false')
  await expect(page.locator('.service-list li')).toHaveCount(6)
  for(const id of ['process','results','book','faq'])await expect(page.locator(`#${id}`)).toBeVisible()
  // Scrolling the content does not move the animation past its end.
  expect(await page.evaluate(()=>window.__AUREL_SCENE__.state.current.progress)).toBe(1)
  await page.locator('#book input[name=name]').fill('Test')
  await page.locator('#book input[name=car]').fill('Test car')
  await page.locator('#book button[type=submit]').click()
  await expect(page.locator('.book-sent')).toBeVisible()
  expect(errors).toEqual([])
})

test.describe('phone',()=>{
  test.use({viewport:{width:390,height:844}})
  test('layout fits a phone width without horizontal scrolling',async({page})=>{
    test.setTimeout(600000)
    await page.goto('/')
    await expect(page.locator('.loading-screen')).toHaveClass(/loaded/,{timeout:120000})
    await story(page,.7)
    await expect(page.locator('.story-ui')).toHaveAttribute('data-stage','foam')
    for(const selector of ['.stage-rail','.gauge','#stage-foam h2','.site-header .cta']){
      const box=await page.locator(selector).boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390)
    }
    await page.locator('#faq').scrollIntoViewIfNeeded()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
