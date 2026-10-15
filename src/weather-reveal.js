// The original rain onset: 64% of the studio's 60% scroll range.
export const RAIN_REVEAL_PROGRESS=.64*.6
export const MIST_DENSITY=1.7
export function createWeatherReveal(progress=0){return {revealed:progress>=RAIN_REVEAL_PROGRESS}}
export function advanceWeatherReveal(reveal,progress,blackout,reducedMotion=false){
  if(progress<RAIN_REVEAL_PROGRESS)reveal.revealed=false
  else if(reducedMotion || blackout>=.999 || progress>=.6)reveal.revealed=true
  return reveal.revealed?1:0
}
