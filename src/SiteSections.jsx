import { useState } from 'react'
import { MARQUEE, SERVICES, PROCESS, RESULTS, FAQ, NAV } from './site-content.js'

const pad=n=>String(n+1).padStart(2,'0')
const price=n=>`$${n.toLocaleString('en-US')}`

function Heading({ kicker, plain, accent, children }) {
  return <header className="section-head">
    <p className="section-kicker">{kicker}</p>
    <h2 className="skew-heading"><span className="line-plain">{plain}</span><span className="line-accent">{accent}</span></h2>
    {children&&<p className="section-lede">{children}</p>}
  </header>
}

export function Marquee() {
  const items=[...MARQUEE,...MARQUEE]
  return <div className="marquee" aria-label={MARQUEE.join(', ')}>
    <div className="marquee-track" aria-hidden="true">
      {[0,1].map(copy=><span key={copy} className="marquee-run">{items.map((item,i)=><span key={i}>{item}<i>✦</i></span>)}</span>)}
    </div>
  </div>
}

function Booking() {
  const [sent,setSent]=useState(false)
  return <section id="book" className="section book">
    <Heading kicker="Book" plain="Bring it in." accent="Leave the rest.">One car in the studio at a time. Tell us what you drive and what you want from it, and we'll come back with a slot and a quote.</Heading>
    {sent
      ?<p className="book-sent" role="status">Thanks. AUREL is a concept studio, so nothing was sent, but this is where we'd confirm your slot.</p>
      :<form className="book-form" onSubmit={e=>{e.preventDefault();setSent(true)}}>
        <label>Name<input name="name" autoComplete="name" required/></label>
        <label>Car<input name="car" placeholder="Make, model, year" required/></label>
        <label>Service<select name="service" defaultValue={SERVICES[2].name}>{SERVICES.map(s=><option key={s.name}>{s.name}</option>)}</select></label>
        <label>Preferred week<input name="week" type="week"/></label>
        <button type="submit" className="cta cta-large">Request a slot <span aria-hidden="true">→</span></button>
      </form>}
  </section>
}

export default function SiteSections() {
  return <div className="site">
    <Marquee/>

    <section id="services" className="section services">
      <Heading kicker="Services" plain="Six finishes." accent="One standard.">Prices are starting points for a mid-size car in reasonable condition. Every job starts with a measured inspection.</Heading>
      <ol className="service-list">
        {SERVICES.map((s,i)=><li key={s.name}>
          <span className="service-index">{pad(i)}</span>
          <h3>{s.name}</h3>
          <p>{s.detail}</p>
          <span className="service-time">{s.time}</span>
          <span className="service-price"><small>from</small>{price(s.price)}</span>
        </li>)}
      </ol>
    </section>

    <section id="process" className="section process">
      <Heading kicker="Process" plain="Measured" accent="every step."/>
      <ol className="process-grid">
        {PROCESS.map((step,i)=><li key={step.title}><span>{pad(i)}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}
      </ol>
    </section>

    <section id="results" className="section results">
      <Heading kicker="Results" plain="Numbers," accent="not adjectives."/>
      <dl className="results-grid">
        {RESULTS.map(r=><div key={r.label}><dt>{r.label}</dt><dd>{r.value}<small>{r.unit}</small></dd></div>)}
      </dl>
    </section>

    <Booking/>

    <section id="faq" className="section faq">
      <Heading kicker="FAQ" plain="Fair" accent="questions."/>
      <div className="faq-list">
        {FAQ.map(item=><details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
      </div>
    </section>

    <footer className="footer">
      <div className="footer-brand"><span className="wordmark">AUREL</span><span>Automotive detail atelier</span></div>
      <nav aria-label="Footer"><ul>{NAV.map(n=><li key={n.href}><a href={n.href}>{n.label}</a></li>)}</ul></nav>
      <p className="footer-credit">Ferrari model by <a href="https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6">vicent091036</a>, via the Three.js examples. AUREL is an independent concept with no affiliation to Ferrari S.p.A.</p>
    </footer>
  </div>
}
