import { test, expect } from '@playwright/test'

async function scrollTo(page, p) {
  await page.evaluate(p => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight)*p, behavior: 'instant' }), p)
}
async function settled(page, p) {
  await page.waitForFunction(p => {
    const v = document.querySelector('video')
    return v?.readyState >= 2 && !v.seeking && Math.abs(v.currentTime/v.duration - p) < .025
  }, p)
}
async function pixels(page) {
  return page.locator('video').evaluate(video => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 36
    const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0, 64, 36)
    const data = ctx.getImageData(0, 0, 64, 36).data
    let hash = 2166136261, light = 0
    for (let i = 0; i < data.length; i += 4) {
      hash = Math.imul(hash ^ data[i], 16777619)
      light += data[i] + data[i + 1] + data[i + 2]
    }
    return { hash: hash >>> 0, light }
  })
}
async function noInterface(page) {
  expect(await page.locator('main').evaluate(main => {
    const copy = main.cloneNode(true)
    copy.querySelectorAll('canvas, video').forEach(node => node.remove())
    return copy.textContent.trim()
  })).toBe('')
  await expect(page.locator('button, nav, header, footer, h1')).toHaveCount(0)
}

test('path-traced film renders and scrubs forward and backward without free look', async ({ page }) => {
  const errors = []; const external = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('request', r => { if (r.url().startsWith('http') && !r.url().startsWith('http://127.0.0.1:3000')) external.push(r.url()) })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'cycles-film')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  const metadata = await page.locator('video').evaluate(v => ({ width:v.videoWidth, height:v.videoHeight, duration:v.duration, paused:v.paused }))
  expect(metadata.width).toBe(1280); expect(metadata.height).toBe(720)
  expect(metadata.duration).toBeGreaterThan(7); expect(metadata.paused).toBe(true)
  await noInterface(page)
  const overview = await pixels(page)
  expect(overview.light).toBeGreaterThan(10000)
  await page.screenshot({ path:'/tmp/aurel-film-overview.png' })
  await scrollTo(page, .53); await settled(page, .53)
  const aerial = await pixels(page)
  expect(aerial.hash).not.toBe(overview.hash)
  await page.screenshot({ path:'/tmp/aurel-film-aerial.png' })
  await scrollTo(page, .89); await settled(page, .89)
  const rain = await pixels(page)
  expect(rain.hash).not.toBe(aerial.hash)
  await page.screenshot({ path:'/tmp/aurel-film-rain.png' })
  await scrollTo(page, .1); await settled(page, .1)
  const before = await page.locator('video').evaluate(v => v.currentTime)
  await page.mouse.move(350, 350); await page.mouse.down()
  await page.mouse.move(700, 450, { steps:6 }); await page.mouse.up()
  expect(Math.abs(await page.locator('video').evaluate(v => v.currentTime) - before)).toBeLessThan(.04)
  await page.emulateMedia({ reducedMotion:'no-preference' })
  await scrollTo(page, .73); await settled(page, .73)
  expect(await page.locator('video').evaluate(v => v.paused)).toBe(true)
  expect(await page.evaluate(() => Boolean(window.__AUREL_SCENE__))).toBe(false)
  expect(errors).toEqual([]); expect(external).toEqual([])
})

test('mobile keeps the full cinematic frame visible and supports seeking', async ({ browser }) => {
  const context = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1, isMobile:true, hasTouch:true, reducedMotion:'reduce' })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3000')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'cycles-film')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  expect(await page.locator('video').evaluate(v => getComputedStyle(v).objectFit)).toBe('contain')
  await scrollTo(page, .7); await settled(page, .7)
  await noInterface(page)
  await page.screenshot({ path:'/tmp/aurel-film-mobile.png' })
  await context.close()
})

test('missing media falls back to a live 3D drone scene', async ({ page }) => {
  await page.route(/\/cinema\/aurel-cycles\.(mp4|webm)/, route => route.abort())
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'webgl')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  await page.waitForFunction(() => window.__AUREL_SCENE__?.gl.info.render.triangles > 100000)
  await scrollTo(page, .5)
  await page.waitForFunction(() => window.__AUREL_SCENE__.camera.position.y > 5.5)
  const position = await page.evaluate(() => window.__AUREL_SCENE__.camera.position.toArray())
  expect(position[0]).toBeGreaterThan(2)
  expect(position[2]).toBeGreaterThan(4)
  await noInterface(page)
})
