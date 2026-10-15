// Vehicle front is -Z. Original studio side passes retain a fixed optical axis.
export const SHOTS = [
  { p:0, position:[6.3,2.8,-6.6], target:[0,.65,0], fov:36 },
  { p:.12, position:[4,.9,-1.4], target:[0,.9,-1.4], fov:32 },
  { p:.30, position:[4,.9,1.4], target:[0,.9,1.4], fov:32 },
  { p:.42, position:[5.5,3.8,10], target:[0,.65,.6], fov:36 },
  { p:.54, position:[1.6,3.9,16], target:[0,.65,.4], fov:38 },
  { p:.64, position:[-1,3.4,15], target:[0,.65,.3], fov:38 },
  { p:.73, position:[2.8,2.4,8.4], target:[0,.7,1], fov:35 },
  { p:.83, position:[3.5,.9,1.65], target:[0,.9,1.65], fov:32 },
  { p:1, position:[3.5,.9,-1.65], target:[0,.9,-1.65], fov:32 },
]
export const FOAM_SHOTS = [
  { p:0, position:[3.5,.9,-1.65], target:[0,.9,-1.65], fov:32, roll:0 },
  { p:.22, position:[4.2,1.65,-4.8], target:[0,.75,-.7], fov:36, roll:-.01 },
  { p:.46, position:[3.2,1.5,.8], target:[0,.8,.8], fov:36, roll:.01 },
  { p:.70, position:[4.8,4,5], target:[0,.65,.5], fov:40, roll:.025 },
  { p:1, position:[6.8,3.1,-6.7], target:[0,.65,0], fov:38, roll:0 },
]
export const RINSE_SHOTS = [
  {...FOAM_SHOTS.at(-1),p:0},
  {p:.28,position:[5.4,1.8,-7.4],target:[0,.72,-.6],fov:36,roll:-.012},
  {p:.58,position:[5.8,1.6,.2],target:[0,.8,0],fov:35,roll:.008},
  {p:.8,position:[4.8,2.8,6.8],target:[0,.65,.4],fov:38,roll:.012},
  {p:1,position:[7.8,3.5,8.5],target:[0,.65,0],fov:36,roll:0},
]
export const CHAPTERS = [
  { id:'studio', start:0, end:.6, shots:SHOTS },
  { id:'foam', start:.6, end:.82, shots:FOAM_SHOTS },
  { id:'rinse', start:.82, end:1, shots:RINSE_SHOTS },
]
export function chapterAt(progress) {
  const p=Math.min(1,Math.max(0,progress))
  const index=p<.6?0:p<.82?1:2
  const chapter=CHAPTERS[index]
  return { ...chapter, index, local:(p-chapter.start)/(chapter.end-chapter.start) }
}
export function shotAt(progress, aspect=16/9, shots=SHOTS) {
  const studio=shots===SHOTS,p=Math.min(1,Math.max(0,progress))
  let index=shots.findIndex((_,i)=>i<shots.length-1 && p<=shots[i+1].p)
  if(index<0)index=shots.length-2
  const a=shots[index],b=shots[index+1],span=b.p-a.p,t=(p-a.p)/span
  const sidePair=i=>studio && (i===1 || i===7)
  const value=(key,axis)=>{
    const get=s=>axis===undefined?(s[key]??0):s[key][axis]
    const tangent=i=>{
      // Match the final studio track in GLOBAL scroll space at the uncut join.
      const chapterIndex=CHAPTERS.findIndex(c=>c.shots===shots)
      if(chapterIndex>0 && i===0){
        const previous=CHAPTERS[chapterIndex-1],current=CHAPTERS[chapterIndex]
        const a=previous.shots.at(-2),b=previous.shots.at(-1)
        return (get(b)-get(a))/(b.p-a.p)*(current.end-current.start)/(previous.end-previous.start)
      }
      // Both ends of a side pass share its exact velocity. This preserves the
      // horizontal optical axis and makes its incoming/outgoing connector C1.
      const pair=sidePair(i)?i:sidePair(i-1)?i-1:-1
      if(pair>=0)return (get(shots[pair+1])-get(shots[pair]))/(shots[pair+1].p-shots[pair].p)
      const before=shots[Math.max(0,i-1)],after=shots[Math.min(shots.length-1,i+1)]
      return (get(after)-get(before))/(after.p-before.p)
    }
    const m0=tangent(index),m1=tangent(index+1)
    return (2*t**3-3*t*t+1)*get(a)+(t**3-2*t*t+t)*span*m0+(-2*t**3+3*t*t)*get(b)+(t**3-t*t)*span*m1
  }
  const position=a.position.map((_,i)=>value('position',i)), target=a.target.map((_,i)=>value('target',i))
  if(aspect<1)position.forEach((v,i)=>{position[i]=target[i]+(v-target[i])*2.15})
  return { position,target,fov:value('fov'),roll:value('roll') }
}
export function rainfallAt(progress) {
  return progress>=.64?1:0
}
export function precipitationAt(progress) {
  const chapter=chapterAt(progress)
  if(chapter.id==='studio')return rainfallAt(chapter.local)
  if(chapter.id==='rinse')return 0
  const t=Math.min(1,Math.max(0,chapter.local/.16))
  return 1-t*t*(3-2*t)
}
export function foamAt(progress) {
  const t=Math.min(1,Math.max(0,(progress-.08)/.62))
  return t*t*(3-2*t)
}
export function sprayAt(progress) {
  const smooth=(a,b)=>{const t=Math.min(1,Math.max(0,(progress-a)/(b-a)));return t*t*(3-2*t)}
  return smooth(.025,.07)*(1-smooth(.66,.74))
}

// Slow, shared translation keeps the cinematic rig alive when scrolling stops.
// Position and aim move together: this does not introduce orbit or pointer control.
export function cameraDriftAt(time) {
  return [.045*Math.sin(time*.19),.018*Math.sin(time*.23),.045*(Math.cos(time*.19)-1)]
}

export function rinseAt(progress) {
  const t=Math.min(1,Math.max(0,(progress-.08)/.48))
  return t*t*(3-2*t)
}
export function rinseSprayAt(progress) {
  const smooth=(a,b)=>{const t=Math.min(1,Math.max(0,(progress-a)/(b-a)));return t*t*(3-2*t)}
  return smooth(.025,.07)*(1-smooth(.85,.94))
}

export function floorRinseAt(progress) {
  const t=Math.min(1,Math.max(0,(progress-.62)/.26))
  return t*t*(3-2*t)
}
