import {useEffect,useState} from 'react'

const messages={assets:'Loading the car and its finishes.',lighting:'Warming the lights and reflections.',frame:'Getting your first view ready.'}

export default function LoadingScreen({ready,phase,failed}) {
  const [slow,setSlow]=useState(false)
  useEffect(()=>{
    if(ready)return
    const timer=setTimeout(()=>setSlow(true),20000)
    return ()=>clearTimeout(timer)
  },[ready])
  return <div className={`loading-screen ${ready&&!failed?'loaded':''} ${failed?'is-failed':''}`} aria-hidden={ready&&!failed} inert={ready&&!failed}>
    <div className="loader-content" role={failed?'alert':'status'} aria-live="polite">
      <div className="loader-orbit" aria-hidden="true"><span className="loader-ring"/><span className="loader-core"/></div>
      <span className="loader-brand">AUREL</span>
      <h2>{failed?'Let’s try the studio again.':'Preparing your studio'}</h2>
      <p className="loader-message">{failed?'The 3D view couldn’t start. You can retry or browse below.':messages[phase]||messages.assets}</p>
      {!failed&&<span className="loader-track" aria-hidden="true"><span/></span>}
      <p className="loader-note">{failed?'':slow?'Taking a little longer? Our services are ready to explore.':'Feel free to browse our services while the studio loads.'}</p>
      <div className="loader-actions">
        {failed&&<button type="button" onClick={()=>location.reload()}>Retry studio</button>}
        <a href="#services">Browse services <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  </div>
}
