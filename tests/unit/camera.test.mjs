import test from 'node:test'
import assert from 'node:assert/strict'
import { SHOTS, shotAt, rainfallAt } from '../../src/cinematography.js'

test('continuous drone flight stays outside the body and above the floor', () => {
  for (let i = 0; i <= 1000; i++) {
    const shot = shotAt(i/1000)
    assert(shot.position.every(Number.isFinite))
    assert(shot.position[1] > 1)
    assert(Math.hypot(shot.position[0], shot.position[2]) > 3)
    assert(shot.fov > 30 && shot.fov < 50)
    assert(Math.abs(shot.roll) < .07)
    const distance = Math.hypot(...shot.position.map((v, j) => v - shot.target[j]))
    assert(distance > 2.5)
  }
})

test('rear view is an elevated offset sweep and rain arrives during that sweep', () => {
  const rear = shotAt(.5)
  assert(rear.position[1] > 5)
  assert(rear.position[0] > 2)
  assert(rear.position[2] > 4)
  assert(shotAt(.6).position[0] < 0)
  assert.equal(rainfallAt(.49), 0)
  assert(rainfallAt(.57) > 0)
  assert.equal(rainfallAt(.7), 1)
  assert.equal(rainfallAt(1), 1)
})

test('positions and velocities stay continuous through authored camera keys', () => {
  const h = 1e-5
  for (const { p } of SHOTS.slice(1, -1)) {
    const a = shotAt(p - h).position, b = shotAt(p).position, c = shotAt(p + h).position
    for (let axis = 0; axis < 3; axis++) {
      assert(Math.abs(a[axis] - c[axis]) < .01)
      const incoming = (b[axis] - a[axis])/h
      const outgoing = (c[axis] - b[axis])/h
      assert(Math.abs(incoming - outgoing) < .1)
    }
  }
})
