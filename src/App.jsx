import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, CloudRain, Expand, Minimize, Rotate3D, Volume2, VolumeX, X } from 'lucide-react'
import { useProgress } from '@react-three/drei'
import Scene from './Scene.jsx'
import useAtmosphere from './useAtmosphere.js'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'

const CHAPTERS = [
  { label: 'The reveal', eyebrow: '01 — THE REVEAL', title: <>Some things<br />move you.<span>Even still.</span></>, description: 'An icon. A different atmosphere.\nA study of light, form, and feeling.', condition: 'STUDIO', detail: 'Light reveals the extraordinary.' },
  { label: 'The atmosphere', eyebrow: '02 — THE ATMOSPHERE', title: <>A change<br />in the air.<span>Feel it.</span></>, description: 'The room falls quiet. The rain rolls in.\nEvery surface tells a new story.', condition: 'RAINFALL', detail: 'A thousand drops. One singular form.' },
  { label: 'The details', eyebrow: '03 — THE DETAILS', title: <>Nothing<br />overlooked.<span>Look closer.</span></>, description: 'Follow every line. Notice every drop.\nBeauty lives in the smallest details.', condition: 'WET SURFACE', detail: 'An intimate perspective on precision.' },
  { label: 'The presence', eyebrow: '04 — THE PRESENCE', title: <>Made to<br />leave a mark.<span>Stay a while.</span></>, description: 'A final perspective. An enduring feeling.\nSome things need no introduction.', condition: 'AFTER HOURS', detail: 'The view that stays with you.' },
]
const FINISHES = [
  { name: 'Liquid silver', color: '#8c9592' },
  { name: 'Forest metallic', color: '#394735' },
  { name: 'Rosso rubino', color: '#722b31' },
]

class RenderBoundary extends Component {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  componentDidCatch(error) { console.error('The 3D studio could not start:', error); this.props.onError?.() }
  render() {
    if (this.state.error) return <div className="render-error"><p>The studio couldn’t load.</p><span>Check your connection and enable WebGL, then try again.</span><button onClick={() => location.reload()}>Reload the studio <ArrowUpRight size={15} /></button></div>
    return this.props.children
  }
}

function Loading({ ready }) {
  const { progress } = useProgress()
  return <div className={`loading-screen ${ready ? 'loaded' : ''}`} aria-hidden={ready}>
    <span className="loading-wordmark">AUREL</span>
    <div className="loading-line"><span style={{ width: `${progress}%` }} /></div>
    <span className="mono">PREPARING YOUR PERSPECTIVE <span>{Math.round(progress).toString().padStart(2, '0')}%</span></span>
  </div>
}

function Modal({ type, close }) {
  const dialog = useRef()
  useEffect(() => {
    const previous = document.activeElement
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current.focus()
    const key = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const items = dialog.current.querySelectorAll('button, a[href]')
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [close])
  return <div className="modal-backdrop" onClick={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={dialog} onClick={e => e.stopPropagation()}>
      <button className="close-button icon-button" onClick={close} aria-label="Close dialog"><X size={22} /></button>
      <span className="eyebrow"><span className="status-dot" /> {type === 'specs' ? 'THE MACHINE' : 'BEHIND THE STUDY'}</span>
      <h2 id="modal-title">{type === 'specs' ? <>An Italian<br />original.</> : <>A different<br />perspective.</>}</h2>
      {type === 'specs' ? <>
        <p className="modal-intro">Ferrari 458 Italia. Naturally aspirated. Unmistakably alive.</p>
        <div className="spec-grid">
          {[['570', 'CV AT 9,000 RPM'], ['3.4', 'SECONDS · 0–100 KM/H'], ['325', 'KM/H · TOP SPEED'], ['4.5', 'LITRE · V8 ENGINE']].map(([value, label]) => <div key={value}><strong>{value}</strong><span className="mono">{label}</span></div>)}
        </div>
        <p className="modal-note">Manufacturer figures. AUREL is an independent creative study and is not affiliated with Ferrari S.p.A.</p>
        <button className="text-button" onClick={close}>Back to the experience <ArrowUpRight size={16} /></button>
      </> : <>
        <p className="modal-intro">An interactive study of automotive form. Four perspectives, changing weather, and a little room to get lost.</p>
        <p>Everything you see is rendered live in 3D. Scroll to move through the studio, change the finish, or take the camera into your own hands.</p>
        <div className="credits"><span className="mono">MODEL & ATTRIBUTION</span><a href="https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6" target="_blank" rel="noreferrer">Ferrari 458 Italia by vicent091036 <ArrowUpRight size={15} /></a><span>Via the Three.js car materials example. Studio, materials, weather, and camera choreography adapted for this experience. Lighting: Studio Small 03, Greg Zaal / Poly Haven (CC0).</span></div>
        <p className="modal-note">AUREL is an independent concept. Ferrari names, marks, and vehicle design belong to their respective owners.</p>
      </>}
    </section>
  </div>
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [finish, setFinish] = useState(0)
  const [free, setFree] = useState(false)
  const [modal, setModal] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [weatherOverride, setWeatherOverride] = useState(null)
  const [unavailable, setUnavailable] = useState(false)
  const [notice, setNotice] = useState('')
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const progress = useRef(0)
  const progressBar = useRef()
  const current = CHAPTERS[chapter]
  const raining = weatherOverride ?? (chapter === 1 || chapter === 2)
  const sound = useAtmosphere(raining)
  const markReady = useCallback(() => setReady(true), [])
  const closeModal = useCallback(() => setModal(null), [])
  const contextLost = useCallback((event) => { event.preventDefault(); setUnavailable(true) }, [])

  useEffect(() => {
    let frame
    const scroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const p = Math.min(1, Math.max(0, scrollY / (document.documentElement.scrollHeight - innerHeight)))
        progress.current = p
        setChapter(Math.min(3, Math.floor(p * 3 + 0.5)))
        if (progressBar.current) progressBar.current.style.transform = `scaleX(${p})`
      })
    }
    scroll()
    addEventListener('scroll', scroll, { passive: true })
    addEventListener('resize', scroll)
    return () => { removeEventListener('scroll', scroll); removeEventListener('resize', scroll); cancelAnimationFrame(frame) }
  }, [])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])
  useEffect(() => {
    if (!free) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = e => { if (e.key === 'Escape') setFree(false) }
    addEventListener('keydown', escape)
    return () => { document.body.style.overflow = old; removeEventListener('keydown', escape) }
  }, [free])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const goTo = (index) => {
    setFree(false)
    requestAnimationFrame(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * index / 3, behavior: reducedMotion ? 'instant' : 'smooth' }))
  }
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else setNotice('Fullscreen is unavailable in this browser. You can still explore every scene.')
    } catch { setNotice('Fullscreen is unavailable in this view. Open the site in a browser to expand it.') }
  }

  return <>
    <div className="scroll-space" aria-hidden="true" />
    <main data-chapter={chapter} className={`experience ${ready ? 'is-ready' : ''} ${free ? 'free-camera' : ''}`}>
      <div className="stage" aria-label="Interactive 3D Ferrari 458 Italia in a cinematic studio">
        <RenderBoundary onError={markReady}><Scene progress={progress} finish={finish} free={free} reducedMotion={reducedMotion} weatherOverride={weatherOverride} onReady={markReady} onUnavailable={contextLost} /></RenderBoundary>
      </div>
      <div className="scene-shade" />
      <div className="grain" />
      <div className="giant-type" aria-hidden="true">458<span>ITALIA</span></div>

      <header className="header">
        <button className="brand" onClick={() => goTo(0)} aria-label="Aurel, back to the reveal">
          <svg className="brand-mark" width="29" height="30" viewBox="0 0 29 30" fill="none" aria-hidden="true"><path d="M2 27 14.5 3 27 27M8.5 18.5h12M11 27l3.5-7 3.5 7" stroke="currentColor" strokeWidth="1.5" /></svg>
          <span>AUREL<span className="brand-caption">AN AUTOMOTIVE STUDY</span></span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={!modal ? 'active' : ''} onClick={() => goTo(0)}>The experience</button>
          <button className={modal === 'specs' ? 'active' : ''} onClick={() => setModal('specs')}>The machine <ArrowUpRight size={12} /></button>
          <button onClick={() => setModal('about')}>About the study <ArrowUpRight size={12} /></button>
        </nav>
        <button className="fullscreen-button" onClick={toggleFullscreen}><span>{fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>{fullscreen ? <Minimize size={15} /> : <Expand size={15} />}</button>
      </header>

      <div className="chapter-copy" key={chapter}>
        <p className="eyebrow"><span className="status-dot" /> {current.eyebrow}</p>
        <h1>{current.title}</h1>
        <p className="description">{current.description}</p>
        <button className="explore-button" onClick={() => setFree(!free)}><Rotate3D size={17} />{free ? 'Return to the story' : 'Take a closer look'}<ArrowUpRight size={15} /></button>
      </div>

      <aside className="vehicle-label"><span className="label-rule" /><span className="mono">FERRARI</span><strong>458 Italia</strong><span className="vehicle-caption">A naturally aspirated masterpiece.</span></aside>

      <div className="side-index" aria-hidden="true"><span>SCROLL TO DISCOVER</span><span className="vertical-line" /><span>0{chapter + 1} / 04</span></div>

      <div className="finish-control">
        <div className="finish-heading"><span className="mono">EXTERIOR FINISH</span><span>{FINISHES[finish].name}</span></div>
        <div className="swatches" role="group" aria-label="Exterior finish">
          {FINISHES.map((item, index) => <button key={item.name} className={`swatch ${finish === index ? 'selected' : ''}`} style={{ '--swatch': item.color }} onClick={() => setFinish(index)} aria-label={item.name} aria-pressed={finish === index}>{finish === index && <Check size={13} strokeWidth={1.5} />}</button>)}
          <span className="swatch-divider" />
          <button className={`weather-button ${raining ? 'raining' : ''}`} onClick={() => setWeatherOverride(!raining)} aria-label={raining ? 'Turn rain off' : 'Turn rain on'} aria-pressed={raining}><CloudRain size={17} /></button>
        </div>
      </div>

      <footer className="bottom-bar">
        <div className="timeline">
          <div className="timeline-track"><span ref={progressBar} /></div>
          <div className="chapters" role="navigation" aria-label="Scene selection">
            {CHAPTERS.map((item, index) => <button key={item.label} className={chapter === index ? 'selected' : ''} onClick={() => goTo(index)} aria-current={chapter === index ? 'step' : undefined}><span className="chapter-number">0{index + 1}</span><span className="chapter-name">{item.label}</span><span className="chapter-dot" /></button>)}
          </div>
        </div>
        <div className="footer-details">
          <div className="realtime-label"><span className="status-dot" /><span className="mono">REALTIME 3D</span><span className="footer-separator">/</span><span className="footer-descriptor">Crafted to be felt.</span></div>
          <button className="scroll-prompt" onClick={() => goTo(chapter < 3 ? chapter + 1 : 0)}><span>{chapter < 3 ? 'Scroll to experience' : 'Experience it again'}</span><ArrowDown size={13} className={chapter === 3 ? 'arrow-up' : ''} /></button>
          <button className={`sound-button ${sound.enabled ? 'enabled' : ''}`} onClick={sound.toggle} aria-label={sound.enabled ? 'Mute ambient sound' : 'Enable ambient sound'}>{sound.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}<span>Sound {sound.enabled ? 'on' : 'off'}</span><span className="sound-wave"><i /><i /><i /><i /></span></button>
        </div>
      </footer>

      {free && <div className="orbit-notice"><Rotate3D size={17} /><span>Drag to explore<span className="orbit-desktop"> · Scroll to zoom</span></span><button onClick={() => setFree(false)}>Back to the story <X size={14} /></button></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      {unavailable && <div className="context-error" role="alert"><p>The graphics connection was interrupted.</p><button onClick={() => location.reload()}>Reload the studio <ArrowUpRight size={15} /></button></div>}
      {!unavailable && <Loading ready={ready} />}
    </main>
    {modal && <Modal type={modal} close={closeModal} />}
    <div className="sr-only" aria-live="polite">Scene {chapter + 1} of 4: {current.label}. {raining ? 'Rain is falling.' : 'Dry studio.'} Finish: {FINISHES[finish].name}.</div>
  </>
}
