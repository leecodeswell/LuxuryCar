import {test} from 'node:test'
import assert from 'node:assert/strict'
import {renderDpr,titleTextureRatio} from '../../src/render-budget.js'

test('normal desktop viewports retain their previous render resolution',()=>{
  assert.equal(renderDpr(1920,1080,1),1)
  assert.equal(renderDpr(1440,900,2),1.5)
  assert.equal(titleTextureRatio(1100,700,1),2)
})
test('large and high-DPI displays stay within render and title pixel budgets',()=>{
  for(const [width,height,native] of [[1920,1080,2],[3840,2160,2],[7680,4320,1]]){
    const dpr=renderDpr(width,height,native),title=titleTextureRatio(width,height,dpr)
    assert.ok(width*height*dpr*dpr<=3200000.01)
    assert.ok(width*height*title*title<=5000000.01)
    assert.ok(dpr<=native&&dpr>0)
  }
})
