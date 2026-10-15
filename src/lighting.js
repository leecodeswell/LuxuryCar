import {RAIN_REVEAL_PROGRESS} from './weather-reveal.js'

// One authored weather reveal; no repeating wall-clock flicker.
export const LIGHT_CUES=[RAIN_REVEAL_PROGRESS]
const KEYS=[[0,1],[.07,.08],[.14,2.2],[.22,0],[.55,0],[.64,7],[.84,3],[1.04,.2],[1.3,.7],[1.9,1]]
export function lightingAt(age) {
  if(!Number.isFinite(age) || age<0 || age>=1.9)return {gain:1,blackout:0,exposure:1}
  let i=KEYS.findIndex((key,index)=>index<KEYS.length-1 && age<=KEYS[index+1][0])
  const [a,x]=KEYS[i],[b,y]=KEYS[i+1],t=(age-a)/(b-a),s=t*t*(3-2*t),gain=x+(y-x)*s
  const visible=Math.min(1,Math.max(0,gain/.08)),shutter=visible*visible*(3-2*visible)
  return {gain,blackout:1-shutter,exposure:1+Math.max(0,gain-1)*.09}
}
export function createLightingDirector(progress=0) {
  return {previous:progress,age:Infinity,fired:LIGHT_CUES.map(()=>false)}
}
export function advanceLighting(director,progress,delta,reducedMotion=false) {
  director.age+=delta
  for(let i=0;i<LIGHT_CUES.length;i++){
    const cue=LIGHT_CUES[i]
    if(progress<cue)director.fired[i]=false
    if(director.previous<cue && progress>=cue && !director.fired[i]){
      director.fired[i]=true
      if(!reducedMotion)director.age=0
    }
  }
  director.previous=progress
  if(reducedMotion){director.age=Infinity;return lightingAt(Infinity)}
  return lightingAt(director.age)
}
