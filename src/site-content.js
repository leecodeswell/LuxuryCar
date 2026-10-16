// Story stages follow the authored animation timeline (global scroll progress,
// see cinematography.js / stage-lighting.js). Copy changes; the scene does not.
export const STAGES = [
  { id:'arrival', label:'Arrival', start:0, gloss:38,
    lines:['First light.','Nothing hidden.'],
    body:'The car rolls into a dark studio under soft colour. Before anything touches it, we look.',
    readout:{ label:'Colour temp', value:'5600', unit:'K' } },
  { id:'profile', label:'Profile', start:.07, gloss:39,
    lines:['Side on.','Panel by panel.'],
    body:'Level passes down each flank. Paint depth, swirls and trim logged one panel at a time.',
    readout:{ label:'Paint depth', value:'118', unit:'µm' } },
  { id:'survey', label:'Survey', start:.21, gloss:41,
    lines:['Colour light','tells all.'],
    body:'Violet and cyan spots rake the rear arc. Holograms and haze have nowhere left to hide.',
    readout:{ label:'Haze', value:'14', unit:'%' } },
  { id:'rain', label:'Rain', start:.384, copyFrom:.405, gloss:43,
    lines:['Lights out.','Rain in.'],
    body:'The room drops to black and the rain is already falling. Water shows where protection gave up.',
    readout:{ label:'Rainfall', value:'62', unit:'mm/h' } },
  { id:'strobe', label:'Strobe', start:.54, gloss:44,
    lines:['Hard flash.','Last look.'],
    body:'Strobes over a black bay burn off the mist. Then the conveyor lights up underneath.',
    readout:{ label:'Strobe', value:'12', unit:'Hz' } },
  { id:'foam', label:'Foam', start:.6, gloss:47,
    lines:['Buried','in foam.'],
    body:'A thick, pH-neutral coat over body, glass and wheels lifts grit before a mitt goes near the paint.',
    readout:{ label:'Foam pH', value:'7.0', unit:'' } },
  { id:'rinse', label:'Rinse', start:.82, gloss:58,
    lines:['Pressure,','not friction.'],
    body:'A full-width fan sweeps rear to front, then the floor jets chase the runoff out. Nothing is scrubbed.',
    readout:{ label:'Pressure', value:'110', unit:'bar' } },
  { id:'delivery', label:'Delivery', start:.955, gloss:96,
    lines:['Wet look.','Handed back.'],
    body:'96 gloss units at the bonnet, measured under the same lights it arrived in.',
    readout:{ label:'Gloss gain', value:'+58', unit:'GU' } },
]

export function stageAt(progress) {
  let index=0
  STAGES.forEach((stage,i)=>{if(progress>=stage.start)index=i})
  return index
}

// Gloss climbs continuously between stage anchors and settles at the final value.
export function glossAt(progress) {
  const p=Math.min(1,Math.max(0,progress)),i=stageAt(p),a=STAGES[i],b=STAGES[i+1]
  if(!b)return a.gloss
  const t=(p-a.start)/(b.start-a.start)
  return a.gloss+(b.gloss-a.gloss)*t
}

export const MARQUEE = ['Paint correction','Gloss measured','Ceramic coating','Interior detail','Wheels off','Hand finished']

export const SERVICES = [
  { name:'Maintenance Wash', detail:'Pre-foam, two-bucket contact wash, wheels, glass and a spray sealant top-up.', time:'2 hrs', price:95 },
  { name:'Decon & Gloss', detail:'Iron and tar removal, clay, and a one-step polish that lifts light haze.', time:'5 hrs', price:320 },
  { name:'Paint Correction', detail:'Measured multi-stage machine polish. Typically 70 to 90 percent of swirls removed.', time:'2 days', price:850 },
  { name:'Ceramic Coating', detail:'Correction plus a five-year ceramic layer on paint, wheels and glass.', time:'3 days', price:1600 },
  { name:'Interior Restoration', detail:'Leather cleaned and fed, carpets extracted, every vent and seam detailed.', time:'1 day', price:380 },
  { name:'Paint Protection Film', detail:'Self-healing film on the front end, mirrors and sills. Full-body on request.', time:'3 days', price:2400 },
]

export const PROCESS = [
  { title:'Inspect', text:'Gloss and paint-depth readings on every panel, under the studio lights.' },
  { title:'Wash', text:'Foam, rinse and decontaminate. No brushes, no dry wiping.' },
  { title:'Correct', text:'Machine polish chosen panel by panel, re-measured as we go.' },
  { title:'Protect', text:'Sealant, ceramic or film. Then a final inspection with you.' },
]

export const RESULTS = [
  { value:'+58', unit:'GU', label:'Typical gloss gain after correction' },
  { value:'0', unit:'brushes', label:'Touch the paint during the wash' },
  { value:'5', unit:'years', label:'Ceramic coating durability' },
  { value:'1', unit:'car', label:'In the studio at a time' },
]

export const FAQ = [
  { q:'How long do I leave the car with you?', a:'A maintenance wash is same-day. Correction and ceramic work takes two to three days so coatings can cure indoors.' },
  { q:'Will correction thin my clear coat?', a:'We measure paint depth first and only remove what the readings allow. Thin or repainted panels get a lighter approach.' },
  { q:'Do you work on matte or wrapped paint?', a:'Yes. Matte and satin finishes get a dedicated wash and no polishing. Wraps are cleaned and sealed, never machine-polished.' },
  { q:'What do I do after a ceramic coating?', a:'Wait a week before the first wash, then use a pH-neutral shampoo. A yearly inspection keeps the warranty valid.' },
]

export const NAV = [
  { href:'#services', label:'Services' },
  { href:'#process', label:'Process' },
  { href:'#results', label:'Results' },
  { href:'#book', label:'Book' },
  { href:'#faq', label:'FAQ' },
]
