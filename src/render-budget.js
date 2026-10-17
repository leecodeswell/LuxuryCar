// Keep normal desktop resolution while bounding allocations on large/high-DPI
// displays. DOM typography and controls remain at the browser's native scale.
export function renderDpr(width,height,nativeDpr=1) {
  return Math.min(nativeDpr,1.5,Math.sqrt(3200000/Math.max(1,width*height)))
}
export function titleTextureRatio(width,height,dpr) {
  return Math.min(2,dpr*2,Math.sqrt(5000000/Math.max(1,width*height)))
}
