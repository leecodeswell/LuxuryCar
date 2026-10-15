import { useEffect, useRef } from 'react'
import { CINEMA } from './cinematography.js'

export default function CinematicFilm({ progress, reducedMotion, onReady, onError }) {
  const video = useRef(null)
  const ready = useRef(false)
  const shown = useRef(progress.current)
  const callback = useRef(onReady)
  callback.current = onReady

  useEffect(() => {
    const player = video.current
    const controller = new AbortController()
    let objectURL
    const source = player.canPlayType('video/mp4; codecs="avc1.640020"')
      ? '/cinema/aurel-cycles.mp4' : '/cinema/aurel-cycles.webm'
    // A complete compressed buffer permits reliable random seeking even on
    // static hosts that do not implement HTTP byte-range responses.
    fetch(source, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Cinema asset unavailable'); return response.blob() })
      .then(blob => {
        if (controller.signal.aborted) return
        objectURL = URL.createObjectURL(blob)
        player.src = objectURL
        player.load()
      })
      .catch(error => { if (error.name !== 'AbortError') onError() })
    return () => { controller.abort(); if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [onError])

  useEffect(() => {
    const player = video.current
    if (import.meta.env.DEV) window.__AUREL_FILM__ = { progress, shown, ready, player, frames: 0 }
    let frame, previous = performance.now()
    const loaded = () => {
      if (player.readyState < 2) return
      ready.current = true
      callback.current()
    }
    player.addEventListener('loadeddata', loaded)
    player.addEventListener('canplay', loaded)
    if (player.readyState >= 2) loaded()
    const update = now => {
      const dt = Math.min(.1, (now - previous) / 1000)
      previous = now
      const target = progress.current
      if (import.meta.env.DEV && window.__AUREL_FILM__) window.__AUREL_FILM__.frames++
      shown.current = reducedMotion ? target : shown.current + (target - shown.current)*(1 - Math.exp(-dt*5))
      if (ready.current && Number.isFinite(player.duration) && !player.seeking) {
        const last = Math.max(0, player.duration - 1/(CINEMA.fps*2))
        const time = Math.min(last, Math.max(0, shown.current*last))
        // Keep one seek in flight; never build an obsolete scroll seek queue.
        if (Math.abs(player.currentTime - time) > 1/(CINEMA.fps*3)) player.currentTime = time
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
      player.removeEventListener('loadeddata', loaded)
      player.removeEventListener('canplay', loaded)
    }
  }, [progress, reducedMotion])

  return <video
    className="cinematic-film"
    ref={video}
    poster="/cinema/poster.webp"
    preload="auto"
    muted
    playsInline
    disablePictureInPicture
    disableRemotePlayback
    aria-label="Path-traced automotive film controlled by scrolling"
    onError={() => { if (video.current?.error) onError() }}
  />
}
