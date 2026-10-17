import { useEffect, useRef, useState } from 'react'
import { STAGES, stageAt, glossAt } from './site-content.js'
import { storyDistance } from './story-progress.js'
import PaintPicker from './PaintPicker.jsx'

const pad=n=>String(n+1).padStart(2,'0')

// Persistent story UI. It follows the same damped progress as the camera
// (displayed), falling back to raw scroll when the renderer is unavailable.
export default function StoryOverlay({ progress, displayed, reducedMotion,paintColor,onPaintChange }) {
  const [active,setActive]=useState(0)
  const [copyVisible,setCopyVisible]=useState(true)
  const root=useRef(),gloss=useRef()
  useEffect(()=>{
    let frame
    const tick=()=>{
      const p=displayed.current??progress.current,index=stageAt(p),stage=STAGES[index]
      setActive(index)
      setCopyVisible(p>=(stage.copyFrom??stage.start))
      const value=glossAt(p)
      if(gloss.current)gloss.current.textContent=Math.round(value)
      root.current?.style.setProperty('--gauge',((value-30)/70).toFixed(4))
      root.current?.style.setProperty('--story',p.toFixed(4))
      frame=requestAnimationFrame(tick)
    }
    tick()
    return ()=>cancelAnimationFrame(frame)
  },[progress,displayed])

  const jump=(event,index)=>{
    event.preventDefault()
    const next=STAGES[index+1]?.start??1,target=STAGES[index].start+(next-STAGES[index].start)*.35
    window.scrollTo({top:storyDistance()*target,behavior:reducedMotion?'auto':'smooth'})
  }
  const stage=STAGES[active]
  return <div ref={root} className="story-ui" data-stage={stage.id}>
    <nav className="stage-rail" aria-label="Story stages">
      <ol>{STAGES.map((s,i)=><li key={s.id} className={i===active?'is-active':i<active?'is-past':''}>
        <a href={`#stage-${s.id}`} onClick={e=>jump(e,i)} aria-current={i===active?'step':undefined}><span className="rail-index">{pad(i)}</span><span className="rail-label">{s.label}</span></a>
      </li>)}</ol>
    </nav>

    <div className="gauge" aria-hidden="true">
      <span className="gauge-caption">Gloss<br/>units</span>
      <span className="gauge-value"><span ref={gloss}>{STAGES[0].gloss}</span><sup>GU</sup></span>
      <span className="gauge-track"><span className="gauge-fill"/>{Array.from({length:9},(_,i)=><span key={i} className="gauge-tick" style={{'--i':i}}/>)}</span>
      <span className="gauge-readout" key={stage.id}><span>{stage.readout.label}</span><b>{stage.readout.value}<small>{stage.readout.unit}</small></b></span>
    </div>

    <div className="reticle" aria-hidden="true"><span/></div>

    <div className="stage-copy">
      {STAGES.map((s,i)=><article key={s.id} id={`stage-${s.id}`} className={`headline ${i===active&&copyVisible?'is-active':''}`} aria-hidden={i!==active}>
        <p className="headline-kicker"><span>{pad(i)}</span> / {s.label}</p>
        <h2><span className="line-plain">{s.lines[0]}</span><span className="line-accent">{s.lines[1]}</span></h2>
        <p className="headline-body">{s.body}</p>
      </article>)}
    </div>

    <PaintPicker color={paintColor} onChange={onPaintChange} active={active===0}/>
    <div className="hero-wordmark" aria-hidden="true">AUREL</div>
    <div className="scroll-hint" aria-hidden="true">Scroll</div>
  </div>
}
