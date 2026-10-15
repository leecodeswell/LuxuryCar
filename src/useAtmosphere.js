import { useEffect, useRef, useState } from 'react'

// Generated locally: no audio requests, autoplay, or third-party tracking.
export default function useAtmosphere(raining) {
  const [enabled, setEnabled] = useState(false)
  const audio = useRef(null)

  const toggle = async () => {
    if (!audio.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = new AudioContext()
      const master = context.createGain()
      master.gain.value = 0
      master.connect(context.destination)
      const hum = context.createOscillator()
      const humGain = context.createGain()
      hum.type = 'sine'
      hum.frequency.value = 55
      humGain.gain.value = 0.026
      hum.connect(humGain).connect(master)
      hum.start()
      const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
      const data = buffer.getChannelData(0)
      let last = 0
      for (let i = 0; i < data.length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02
        data[i] = last * 3.5
      }
      const noise = context.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1700
      const rainGain = context.createGain()
      rainGain.gain.value = raining ? 0.45 : 0.035
      noise.connect(filter).connect(rainGain).connect(master)
      noise.start()
      audio.current = { context, master, rainGain }
    }
    await audio.current.context.resume()
    audio.current.master.gain.setTargetAtTime(enabled ? 0 : 0.65, audio.current.context.currentTime, 0.35)
    setEnabled(!enabled)
  }

  useEffect(() => {
    if (!audio.current) return
    audio.current.rainGain.gain.setTargetAtTime(raining ? 0.45 : 0.035, audio.current.context.currentTime, 0.7)
  }, [raining])
  useEffect(() => () => { audio.current?.context.close() }, [])
  return { enabled, toggle }
}
