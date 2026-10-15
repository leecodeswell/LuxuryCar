import { test, expect } from '@playwright/test'

async function scrollTo(page, p) {
  await page.evaluate(p => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * p, behavior: 'instant' }), p)
}
async function camera(page) {
  return page.evaluate(() => {
    const c = window.__AUREL_SCENE__.camera
    const e = c.matrixWorld.elements
    return { position: c.position.toArray(), direction: [-e[8], -e[9], -e[10]] }
  })
}

test('plays only the directed shots, with straight side passes and rain after the rear view', async ({ page }) => {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  await page.waitForFunction(() => window.__AUREL_SCENE__?.gl.info.render.triangles > 100000)
  expect(await page.locator('main').evaluate(main => {
    const rendered = main.cloneNode(true)
    rendered.querySelectorAll('canvas').forEach(canvas => canvas.remove())
    return rendered.textContent.trim()
  })).toBe('')
  await expect(page.locator('button, nav, header, footer, h1')).toHaveCount(0)
  await page.screenshot({ path: '/tmp/aurel-cinema-overview.png' })

  await scrollTo(page, 0.2)
  await page.waitForFunction(() => Math.abs(window.__AUREL_SCENE__.camera.position.x - 4) < 0.01)
  const front = await camera(page)
  expect(front.direction[0]).toBeCloseTo(-1, 5)
  expect(front.direction[1]).toBeCloseTo(0, 5)
  expect(front.direction[2]).toBeCloseTo(0, 5)
  await scrollTo(page, 0.35)
  await page.waitForFunction(() => window.__AUREL_SCENE__.camera.position.z > 0.7)
  const back = await camera(page)
  expect(back.position[2]).toBeGreaterThan(front.position[2])
  expect(back.direction).toEqual(front.direction)

  await scrollTo(page, 0.55)
  await page.waitForFunction(() => Math.abs(window.__AUREL_SCENE__.camera.position.z - 6.5) < 0.01)
  expect((await camera(page)).position[0]).toBeCloseTo(0, 5)
  expect(await page.evaluate(() => window.__AUREL_SCENE__.scene.getObjectByName('surface-water').visible)).toBe(false)
  await scrollTo(page, 0.65)
  await page.waitForFunction(() => window.__AUREL_SCENE__.scene.getObjectByName('rainfall').material.opacity > 0.15)
  expect((await camera(page)).position[2]).toBeCloseTo(6.5, 2)

  await scrollTo(page, 0.79)
  await page.waitForFunction(() => Math.abs(window.__AUREL_SCENE__.camera.position.x - 3.5) < 0.01)
  const wetBack = await camera(page)
  await scrollTo(page, 0.95)
  await page.waitForFunction(() => window.__AUREL_SCENE__.camera.position.z < -0.9)
  const wetFront = await camera(page)
  expect(wetFront.position[2]).toBeLessThan(wetBack.position[2])
  expect(wetFront.direction[0]).toBeCloseTo(-1, 5)
  expect(wetFront.direction[1]).toBeCloseTo(0, 5)
  expect(wetFront.direction[2]).toBeCloseTo(0, 5)
  await page.waitForFunction(() => window.__AUREL_SCENE__.scene.getObjectByName('surface-water').material.opacity > 0.6)
  await page.screenshot({ path: '/tmp/aurel-cinema-wet-side.png' })

  await page.mouse.move(400, 350)
  await page.mouse.down()
  await page.mouse.move(650, 420, { steps: 6 })
  await page.mouse.up()
  expect(await camera(page)).toEqual(wetFront)
  expect(errors).toEqual([])
})

test('keeps the mobile frame text-free and the tracking camera side-on', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3000')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  await page.waitForFunction(() => window.__AUREL_SCENE__?.gl.info.render.triangles > 100000)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  expect(await page.locator('main').evaluate(main => {
    const rendered = main.cloneNode(true)
    rendered.querySelectorAll('canvas').forEach(canvas => canvas.remove())
    return rendered.textContent.trim()
  })).toBe('')
  await page.screenshot({ path: '/tmp/aurel-cinema-mobile.png' })
  await scrollTo(page, 0.85)
  await page.waitForFunction(() => window.__AUREL_SCENE__.camera.position.x > 7 && window.__AUREL_SCENE__.camera.position.z < 0.4)
  const side = await camera(page)
  expect(side.direction[0]).toBeCloseTo(-1, 5)
  expect(side.direction[1]).toBeCloseTo(0, 5)
  expect(side.direction[2]).toBeCloseTo(0, 5)
  expect(await page.locator('main').boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })
  await context.close()
})
