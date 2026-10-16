import test from 'node:test'
import assert from 'node:assert/strict'
import { STAGES, stageAt, glossAt } from '../../src/site-content.js'
import { CHAPTERS } from '../../src/cinematography.js'

test('story stages are ordered and aligned with the animation chapters', () => {
  assert.equal(STAGES[0].start, 0)
  STAGES.slice(1).forEach((stage, i) => assert.ok(stage.start > STAGES[i].start))
  const starts = STAGES.map(s => s.start)
  for (const chapter of CHAPTERS) assert.ok(starts.includes(chapter.start), `stage boundary at ${chapter.id}`)
  assert.ok(starts.includes(.384), 'rain stage starts on the authored rain onset')
  for (const stage of STAGES) {
    assert.equal(stage.lines.length, 2)
    assert.ok(stage.body.length > 20 && stage.readout.value)
  }
})

test('stage lookup and gloss gauge follow scroll progress', () => {
  assert.equal(stageAt(0), 0)
  assert.equal(stageAt(.384), STAGES.findIndex(s => s.id === 'rain'))
  assert.equal(stageAt(.7), STAGES.findIndex(s => s.id === 'foam'))
  assert.equal(stageAt(1), STAGES.length - 1)
  let previous = -Infinity
  for (let p = 0; p <= 1; p += .01) { const g = glossAt(p); assert.ok(g >= previous); previous = g }
  assert.equal(glossAt(0), STAGES[0].gloss)
  assert.equal(glossAt(1), STAGES.at(-1).gloss)
})
