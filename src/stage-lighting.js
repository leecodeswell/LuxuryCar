// Scroll-authored show lighting: the pre-wash strobe, the conveyor floor it
// reveals, and four hidden colour spotlights. Everything is a pure function of
// global scroll progress so rewinding replays it exactly.
const smooth=(x,a,b)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)}
const envelope=(p,[a,b,c,d,level=1])=>level*smooth(p,a,b)*(1-smooth(p,c,d))

// The strobe ends exactly as the foam chapter (.6) begins.
export const STROBE_WINDOW=[.54,.552,.592,.5999]
export function strobeAt(progress){return envelope(progress,STROBE_WINDOW)}
// The mist burns off between flashes and stays gone for the wash.
export function mistClearAt(progress){return smooth(progress,.562,.594)}
// Conveyor floor glows through the strobe and carries the car into the wash.
export function conveyorAt(progress){return envelope(progress,[.53,.552,.6,.64])}
// 7.5 Hz hard flashes with a skipped beat every few so it never feels mechanical.
export function strobeFlashAt(time){
  const beat=time*7.5,n=Math.floor(beat)
  return n%5!==3 && beat-n<.3?1:0
}

// Fixtures are deliberately absent: only their light reaches the scene.
// Cues are [rise start, full, fall start, off, level]; white foam takes a lower level.
export const SPOTLIGHTS=[
  {name:'spot-magenta',color:'#ff1a8c',position:[3.8,4.6,-7.2],target:[0,.5,-1.2],intensity:2200,
    cues:[[-.01,0,.045,.075],[.625,.645,.69,.715,.3],[.955,.975,1.01,1.02]]},
  {name:'spot-cyan',color:'#00e5ff',position:[5.6,4.6,6.6],target:[0,.5,1],intensity:2600,
    cues:[[-.01,0,.045,.075],[.265,.285,.33,.36],[.725,.745,.79,.815,.3],[.955,.975,1.01,1.02]]},
  {name:'spot-amber',color:'#ff7a00',position:[6.2,1.3,-3],target:[0,.5,0],intensity:1600,
    cues:[[.41,.43,.49,.52],[.725,.745,.79,.815,.3],[.895,.91,.94,.955,.75],[.955,.975,1.01,1.02]]},
  {name:'spot-violet',color:'#7a2cff',position:[-4.6,6.2,4.2],target:[0,.4,.5],intensity:3000,
    cues:[[.165,.18,.23,.255],[.625,.645,.69,.715,.3],[.835,.85,.885,.9,.5],[.955,.975,1.01,1.02]]},
]
export function spotlightAt(spot,progress){
  let level=0
  for(const cue of spot.cues)level=Math.max(level,envelope(progress,cue))
  return level
}
