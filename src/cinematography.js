// Vehicle front is -Z. Original studio side passes retain a fixed optical axis.
export const SHOTS = [
  { p: 0, position: [6.3, 2.8, -6.6], target: [0, .65, 0], fov: 36 },
  { p: .06, position: [5.9, 2.5, -6.2], target: [0, .65, 0], fov: 36 },
  { p: .16, position: [4, .8, -1.4], target: [0, .8, -1.4], fov: 32 },
  { p: .4, position: [4, .8, 1.4], target: [0, .8, 1.4], fov: 32 },
  { p: .52, position: [0, 2.8, 15.5], target: [0, .65, 0], fov: 38 },
  { p: .65, position: [0, 2.8, 15.5], target: [0, .65, 0], fov: 38 },
  { p: .74, position: [3.5, .8, 1.65], target: [0, .8, 1.65], fov: 32 },
  { p: 1, position: [3.5, .8, -1.65], target: [0, .8, -1.65], fov: 32 },
]
export const SUN_SHOTS = [
  { p:0, position:[7.4,1.15,-7.8], target:[0,.62,-.7], fov:39, roll:-.015 },
  { p:.22, position:[4.2,1.05,-4.5], target:[0,.65,-1], fov:38, roll:.01 },
  { p:.5, position:[4.1,1.25,1.8], target:[0,.66,.7], fov:40, roll:.025 },
  { p:.74, position:[4.5,3.6,5.7], target:[0,.6,.4], fov:40, roll:.02 },
  { p:1, position:[-3.8,5.2,6.1], target:[0,.55,0], fov:40, roll:-.015 },
]
export const FOAM_SHOTS = [
  { p:0, position:[5,2,-5], target:[0,.7,-.5], fov:38, roll:-.018 },
  { p:.24, position:[2.65,1.1,-.2], target:[.2,.8,-.2], fov:36, roll:0 },
  { p:.48, position:[3.4,1.6,3.6], target:[0,.8,1], fov:38, roll:.02 },
  { p:.72, position:[4.7,4.3,5.1], target:[0,.65,.4], fov:40, roll:.025 },
  { p:1, position:[6.8,3.1,-6.7], target:[0,.65,0], fov:38, roll:0 },
]
export const CHAPTERS = [
  { id:'studio', start:0, end:.44, shots:SHOTS },
  { id:'foam', start:.44, end:.72, shots:FOAM_SHOTS },
  { id:'sunlight', start:.72, end:1, shots:SUN_SHOTS },
]
export function chapterAt(progress) {
  const p=Math.min(1,Math.max(0,progress))
  const index=p<.44?0:p<.72?1:2
  const chapter=CHAPTERS[index]
  return { ...chapter, index, local:(p-chapter.start)/(chapter.end-chapter.start) }
}
export function cutFadeAt(progress) {
  const distance=Math.min(Math.abs(progress-.44),Math.abs(progress-.72))
  const t=Math.max(0,1-distance/.009)
  return t*t*(3-2*t)
}
export function shotAt(progress, aspect=16/9, shots=SHOTS) {
  const studio=shots===SHOTS
  let p=Math.min(1,Math.max(0,progress))
  // Establish the new setting, then settle on its final product composition.
  // Future copy can enter during these scroll-driven holds without chasing a camera.
  if(!studio){
    const travel=Math.min(1,Math.max(0,(p-.06)/.86))
    p=travel*travel*(3-2*travel)
  }
  let index=shots.findIndex((_,i)=>i<shots.length-1 && p<=shots[i+1].p)
  if(index<0)index=shots.length-2
  const a=shots[index], b=shots[index+1], span=b.p-a.p
  let t=(p-a.p)/span
  if(studio && index!==2 && index!==6)t=t*t*(3-2*t)
  const mix=(x,y)=>x+(y-x)*t
  const value=(key,axis)=>{
    const get=s=>axis===undefined?(s[key]??0):s[key][axis]
    if(studio)return mix(get(a),get(b))
    const before=shots[Math.max(0,index-1)],after=shots[Math.min(shots.length-1,index+2)]
    const m0=(get(b)-get(before))/(b.p-before.p), m1=(get(after)-get(a))/(after.p-a.p)
    return (2*t**3-3*t*t+1)*get(a)+(t**3-2*t*t+t)*span*m0+(-2*t**3+3*t*t)*get(b)+(t**3-t*t)*span*m1
  }
  const position=a.position.map((_,i)=>value('position',i)), target=a.target.map((_,i)=>value('target',i))
  if(aspect<1)position.forEach((v,i)=>{position[i]=target[i]+(v-target[i])*2.15})
  return { position,target,fov:value('fov'),roll:value('roll') }
}
export function rainfallAt(progress) {
  const t=Math.min(1,Math.max(0,(progress-.58)/.06))
  return t*t*(3-2*t)
}
export function foamAt(progress) {
  const t=Math.min(1,Math.max(0,(progress-.08)/.62))
  return t*t*(3-2*t)
}
export function sprayAt(progress) {
  const smooth=(a,b)=>{const t=Math.min(1,Math.max(0,(progress-a)/(b-a)));return t*t*(3-2*t)}
  return smooth(.025,.07)*(1-smooth(.66,.74))
}
