import { useEffect, useRef } from 'react'
import { rainfallAt } from './cinematography.js'

// Foreground atmosphere remains alive when the scrubbed film is stationary.
// This layer is compositing, separate from the offline path-traced lighting.
export default function Atmosphere({ progress, reducedMotion }) {
  const canvas = useRef()
  useEffect(() => {
    const element = canvas.current, ctx = element.getContext('2d')
    if (!ctx) return
    let frame, width = innerWidth, height = innerHeight, density = 0
    const drops = Array.from({ length: width < 768 ? 45 : 100 }, () => ({ x: Math.random(), y: Math.random(), speed: .16 + Math.random()*.2, length: .006 + Math.random()*.012 }))
    const resize = () => {
      width = innerWidth; height = innerHeight
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      element.width = Math.round(width*dpr); element.height = Math.round(height*dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const draw = now => {
      ctx.clearRect(0, 0, width, height)
      density += (rainfallAt(progress.current) - density)*.045
      if (density > .005 && !document.hidden) {
        const w = Math.min(width, height*16/9), h = w*9/16
        const x = (width - w)/2, y = (height - h)/2
        const time = reducedMotion ? 0 : now/1000
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
        ctx.strokeStyle = `rgba(194, 215, 235, ${density*.1})`
        ctx.lineWidth = .65
        ctx.beginPath()
        for (const drop of drops) {
          const py = ((drop.y + time*drop.speed)%1.15 - .1)*h + y
          const px = drop.x*w + x + Math.sin(time*.08 + drop.y)*5
          ctx.moveTo(px, py); ctx.lineTo(px - 1.6, py + h*drop.length)
        }
        ctx.stroke()
        for (let i = 0; i < 2; i++) {
          const gx = x + w*(.25 + i*.5 + Math.sin(time*.07 + i)*.1)
          const gy = y + h*.91
          const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, w*.34)
          glow.addColorStop(0, `rgba(116, 151, 183, ${density*.026})`)
          glow.addColorStop(1, 'rgba(116,151,183,0)')
          ctx.fillStyle = glow; ctx.fillRect(x, y + h*.4, w, h*.6)
        }
        ctx.restore()
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frame); removeEventListener('resize', resize) }
  }, [progress, reducedMotion])
  return <canvas className="atmosphere" ref={canvas} aria-hidden="true" />
}
