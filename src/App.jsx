import { Component, useCallback, useEffect, useRef, useState } from 'react'
import Scene from './Scene.jsx'
import StoryOverlay from './StoryOverlay.jsx'
import SiteSections from './SiteSections.jsx'
import { NAV } from './site-content.js'
import { storyProgress } from './story-progress.js'
import { PAINT_COLORS } from './paint-colors.js'

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
  const [paintColor,setPaintColor] = useState(PAINT_COLORS[0].value)
  const [unavailable, setUnavailable] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [storyInView, setStoryInView] = useState(true)
  const [pastStory, setPastStory] = useState(false)
  const progress = useRef(0)
  const displayed = useRef(null)
  const story = useRef()
  const markReady = useCallback(() => setReady(true), [])
  const contextLost = useCallback(event => { event.preventDefault(); setUnavailable(true) }, [])

  useEffect(() => {
    const update = () => {
      progress.current = storyProgress()
      const bottom = story.current?.getBoundingClientRect().bottom ?? Infinity
      setPastStory(bottom < innerHeight * .55)
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setStoryInView(entry.isIntersecting))
    observer.observe(story.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return <>
    <a className="skip-link" href="#services">Skip to services</a>
    <header className={`site-header ${pastStory ? 'is-solid' : ''}`}>
      <a className="brand" href="#top" onClick={e => { e.preventDefault(); scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }) }}>
        <span className="wordmark">AUREL</span><span className="brand-tagline">Detail atelier <i>/</i> Studio 01</span>
      </a>
      <nav className="site-nav" aria-label="Main" aria-hidden={!pastStory}>
        <ul>{NAV.map(n => <li key={n.href}><a href={n.href} tabIndex={pastStory ? undefined : -1}>{n.label}</a></li>)}</ul>
      </nav>
      <a className="cta" href="#book">Book a detail <span aria-hidden="true">→</span></a>
    </header>

    <main id="top">
      <h1 className="visually-hidden">AUREL — luxury car detailing, from inspection to a measured, rinsed, high-gloss finish</h1>
      <section ref={story} className="story" aria-label="The detail, stage by stage">
        <div className="story-track" aria-hidden="true" />
        <div className={`experience ${ready ? 'is-ready' : ''}`}>
          <div className="stage" role="img" aria-label="A live 3D car in a studio: rain, a heavy sprayed foam coating, and progressive body and floor rinses.">
            <RenderBoundary onError={markReady}>
              <Scene progress={progress} displayed={displayed} active={storyInView} reducedMotion={reducedMotion} onReady={markReady} onUnavailable={contextLost} paintColor={paintColor} />
            </RenderBoundary>
          </div>
          <div className={`loading-screen ${ready ? 'loaded' : ''}`} aria-hidden="true" />
          <StoryOverlay progress={progress} displayed={displayed} reducedMotion={reducedMotion} paintColor={paintColor} onPaintChange={setPaintColor} />
          {unavailable && <div className="render-error" role="alert">The graphics connection was interrupted. Reload to return to the studio.</div>}
        </div>
      </section>
      <SiteSections />
    </main>
  </>
}
