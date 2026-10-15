import { Component, useCallback, useEffect, useRef, useState } from 'react'
import Scene from './Scene.jsx'

class RenderBoundary extends Component {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  componentDidCatch(error) {
    console.error('The 3D studio could not start:', error)
    this.props.onError?.()
  }
  render() {
    if (this.state.error) return <div className="render-error" role="alert">The studio couldn’t load. Enable WebGL and reload the page.</div>
    return this.props.children
  }
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const progress = useRef(0)
  const markReady = useCallback(() => setReady(true), [])
  const contextLost = useCallback(event => { event.preventDefault(); setUnavailable(true) }, [])

  useEffect(() => {
    const update = () => {
      const distance = document.documentElement.scrollHeight - innerHeight
      progress.current = distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return <>
    <div className="scroll-space" aria-hidden="true" />
    <main className={`experience ${ready ? 'is-ready' : ''}`} aria-label="Three live 3D automotive sequences: a hexagon-lit studio with rain, extreme sunlight in a mineral courtyard, and a dark wash chamber with soap foam.">
      <div className="stage">
        <RenderBoundary onError={markReady}>
          <Scene progress={progress} reducedMotion={reducedMotion} onReady={markReady} onUnavailable={contextLost} />
        </RenderBoundary>
      </div>
      <div className="cinematic-grade" aria-hidden="true" />
      <div className={`loading-screen ${ready ? 'loaded' : ''}`} aria-hidden="true" />
      {unavailable && <div className="render-error" role="alert">The graphics connection was interrupted. Reload to return to the studio.</div>}
    </main>
  </>
}
