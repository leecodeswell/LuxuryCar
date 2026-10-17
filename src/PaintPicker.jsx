import {PAINT_COLORS} from './paint-colors.js'

export default function PaintPicker({color,onChange,active}) {
  const selected=PAINT_COLORS.find(paint=>paint.value===color)
  return <fieldset className="paint-picker" inert={!active} aria-hidden={!active}>
    <legend className="visually-hidden">Paint color</legend>
    <div className="paint-picker-caption"><span>Paint</span><output aria-live="polite">{selected.name}</output></div>
    <div className="paint-swatches">
      {PAINT_COLORS.map(paint=><label key={paint.value} className="paint-swatch" title={paint.name} style={{'--paint':paint.value}}>
        <input type="radio" name="paint-color" value={paint.value} checked={color===paint.value} onChange={()=>onChange(paint.value)}/>
        <span className="paint-chip" aria-hidden="true"/>
        <span className="visually-hidden">{paint.name}</span>
      </label>)}
    </div>
  </fieldset>
}
