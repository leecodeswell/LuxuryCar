import { test, expect } from '@playwright/test'

test('renders the car, directs all scenes, and operates the studio controls', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  await expect(page.locator('h1')).toContainText('Some things')
  await page.waitForFunction(() => {
    const studio = window.__AUREL_SCENE__
    return studio?.scene.getObjectByName('body')?.geometry.attributes.position.count > 1000 && studio.gl.info.render.triangles > 100_000
  })
  await page.screenshot({ path: '/tmp/aurel-verified-desktop.png', animations: 'disabled' })

  await page.getByRole('button', { name: 'Rosso rubino', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rosso rubino', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.waitForFunction(() => {
    const color = window.__AUREL_SCENE__.scene.getObjectByName('body').material.color
    return color.r > color.g * 3
  })
  await page.getByRole('button', { name: 'Liquid silver', exact: true }).click()

  await page.getByRole('button', { name: '02 The atmosphere' }).click()
  await expect(page.locator('h1')).toContainText('A change')
  await page.waitForFunction(() => {
    const scene = window.__AUREL_SCENE__.scene
    return scene.getObjectByName('rainfall').material.opacity > 0.15 && scene.getObjectByName('surface-water').material.opacity > 0.5
  })
  await expect(page.getByRole('button', { name: 'Turn rain off' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: '03 The details' }).click()
  await expect(page.locator('h1')).toContainText('Nothing')
  await page.waitForFunction(() => window.__AUREL_SCENE__.camera.position.z < -3 && window.__AUREL_SCENE__.camera.position.z > -3.2)
  await page.screenshot({ path: '/tmp/aurel-verified-droplets.png', animations: 'disabled' })

  await page.getByRole('button', { name: 'Turn rain off' }).click()
  await page.waitForFunction(() => !window.__AUREL_SCENE__.scene.getObjectByName('surface-water').visible)
  await page.getByRole('button', { name: '04 The presence' }).click()
  await expect(page.locator('h1')).toContainText('Made to')
  await page.waitForFunction(() => window.__AUREL_SCENE__.camera.position.z > 6)
  await page.screenshot({ path: '/tmp/aurel-verified-rear.png', animations: 'disabled' })

  await page.getByRole('button', { name: 'Take a closer look' }).click()
  await expect(page.locator('main')).toHaveClass(/free-camera/)
  const before = await page.evaluate(() => window.__AUREL_SCENE__.camera.position.x)
  await page.mouse.move(750, 400)
  await page.mouse.down()
  await page.mouse.move(850, 440, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => Math.abs(await page.evaluate(() => window.__AUREL_SCENE__.camera.position.x) - before)).toBeGreaterThan(0.1)
  await page.keyboard.press('Escape')
  await expect(page.locator('main')).not.toHaveClass(/free-camera/)

  await page.getByRole('button', { name: 'The machine' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('570')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Enable ambient sound' }).click()
  await expect(page.getByRole('button', { name: 'Mute ambient sound' })).toBeVisible()
  await page.getByRole('button', { name: 'Mute ambient sound' }).click()
  await expect(page.getByRole('button', { name: 'Enable ambient sound' })).toBeVisible()
  expect(errors).toEqual([])
})

test('fits a mobile viewport and keeps touch controls available', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:3000')
  await expect(page.locator('.loading-screen')).toHaveClass(/loaded/)
  await page.waitForFunction(() => window.__AUREL_SCENE__?.gl.info.render.triangles > 100_000)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect(page.getByRole('button', { name: 'Turn rain on' })).toBeVisible()
  await page.screenshot({ path: '/tmp/aurel-verified-mobile.png', animations: 'disabled' })
  await page.getByRole('button', { name: '02 The atmosphere' }).tap()
  await expect(page.locator('h1')).toContainText('A change')
  await expect(page.getByRole('button', { name: 'Turn rain off' })).toBeVisible()
  const bounds = await page.locator('main').boundingBox()
  expect(bounds).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })
  await page.getByRole('button', { name: 'The machine' }).tap()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
  await context.close()
})
