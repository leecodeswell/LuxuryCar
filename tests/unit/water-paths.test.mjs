import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {decodeWaterPaths} from '../../src/water-runners.js'

const asset=readFileSync(new URL('../../public/models/water-runners.bin',import.meta.url))
const buffer=asset.buffer.slice(asset.byteOffset,asset.byteOffset+asset.byteLength)

test('baked paths belong to the current car and stay within a small delivery budget',()=>{
  const model=readFileSync(new URL('../../public/models/ferrari.glb',import.meta.url))
  assert.deepEqual(asset.subarray(12,44),createHash('sha256').update(model).digest())
  assert.ok(asset.byteLength<45000)
})
test('all baked droplets follow descending body paths with valid normals and timing',()=>{
  const {paths,randomDraws}=decodeWaterPaths(buffer)
  assert.equal(paths.length,256);assert.ok(randomDraws>0)
  for(const path of paths){
    const points=path.curve.points
    assert.ok(points.length>=5&&points.length<=12)
    assert.ok(points.at(-1).y<points[0].y)
    assert.equal(points.length,path.normals.length)
    assert.ok(path.phase>=0&&path.phase<=1)
    assert.ok(path.speed>=.049&&path.speed<=.101)
    assert.ok(path.radius>=.0024&&path.radius<=.0061)
    for(const [i,p] of points.entries()){
      assert.ok(Math.abs(p.x)<1.15&&Math.abs(p.z)<2.4&&p.y>.12&&p.y<1.3)
      assert.ok(Math.abs(path.normals[i].length()-1)<1e-6)
    }
  }
})
