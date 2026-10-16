// Scroll progress through the pinned story track (0 at the top, 1 at its end).
// Content sections after the story do not advance the animation.
export function storyDistance() {
  const track=document.querySelector('.story-track')
  return track?track.offsetHeight-innerHeight:document.documentElement.scrollHeight-innerHeight
}
export function storyProgress() {
  const distance=storyDistance()
  return distance>0?Math.min(1,Math.max(0,scrollY/distance)):0
}
