import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, CameraOff, Mic, MicOff, AlertTriangle } from 'lucide-react'
import { createLocalVideoTrack } from 'livekit-client'
import { Button, Card, Input, Logo, cx } from '../ui'

/** Device check before joining: preview, mic/camera toggles and device selection. */
export default function PreJoin({ room, defaultName, onJoin, joining, error }) {
  const [name, setName] = useState(defaultName || '')
  const [video, setVideo] = useState(true)
  const [audio, setAudio] = useState(true)
  const [devices, setDevices] = useState({ video: [], audio: [] })
  const [videoId, setVideoId] = useState('')
  const [audioId, setAudioId] = useState('')
  const [permError, setPermError] = useState(null)
  const videoEl = useRef(null)
  const trackRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Ask once so device labels are available, then release immediately.
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        s.getTracks().forEach(t => t.stop())
      } catch (err) {
        if (alive) setPermError(err.name === 'NotAllowedError' ? 'Camera/microphone permission was denied. You can still join and enable them later from the browser.' : 'No camera or microphone was found.')
      }
      const list = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      if (!alive) return
      const v = list.filter(d => d.kind === 'videoinput'), a = list.filter(d => d.kind === 'audioinput')
      setDevices({ video: v, audio: a })
      setVideoId(v[0]?.deviceId || ''); setAudioId(a[0]?.deviceId || '')
      if (!v.length) setVideo(false)
      if (!a.length) setAudio(false)
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!video || !videoId) return
    let cancelled = false
    createLocalVideoTrack({ deviceId: videoId, resolution: { width: 1280, height: 720 } })
      .then(t => {
        if (cancelled) { t.stop(); return }
        trackRef.current = t
        if (videoEl.current) t.attach(videoEl.current)
      })
      .catch(() => setPermError('Camera could not be started.'))
    return () => {
      cancelled = true
      trackRef.current?.detach(); trackRef.current?.stop(); trackRef.current = null
    }
  }, [video, videoId])

  const submit = (e) => {
    e.preventDefault()
    trackRef.current?.stop() // release the camera before the room opens it again
    onJoin({ displayName: name.trim(), videoEnabled: video, audioEnabled: audio, videoDeviceId: videoId, audioDeviceId: audioId })
  }

  const Toggle = ({ on, onClick, OnIcon, OffIcon, label, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={label}
      className={cx('w-12 h-12 rounded-full flex items-center justify-center transition-colors disabled:opacity-40', on ? 'bg-white/15 text-white hover:bg-white/25 backdrop-blur' : 'bg-bad text-white hover:brightness-110')}>
      {on ? <OnIcon className="w-5 h-5" /> : <OffIcon className="w-5 h-5" />}
    </button>
  )

  return (
    <div className="min-h-[100dvh] bg-canvas flex flex-col">
      <header className="h-16 px-6 flex items-center"><Logo /></header>
      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl grid lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-surface-3 border shadow-lift">
            {video ? <video ref={videoEl} className="w-full h-full object-cover -scale-x-100" muted playsInline autoPlay />
              : <div className="absolute inset-0 flex items-center justify-center text-ink-3 text-sm">Camera is off</div>}
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
              <Toggle on={audio} onClick={() => setAudio(a => !a)} OnIcon={Mic} OffIcon={MicOff} label={audio ? 'Turn microphone off' : 'Turn microphone on'} disabled={!devices.audio.length} />
              <Toggle on={video} onClick={() => setVideo(v => !v)} OnIcon={Camera} OffIcon={CameraOff} label={video ? 'Turn camera off' : 'Turn camera on'} disabled={!devices.video.length} />
            </div>
          </div>
          <Card className="p-6">
            <p className="text-xs text-ink-3">Joining</p>
            <h1 className="font-display text-2xl font-semibold text-ink mt-1 truncate">{room?.title || 'Meeting'}</h1>
            <p className="text-xs text-ink-3 font-mono mt-1">{room?.roomId}{room?.hostName ? ` · hosted by ${room.hostName}` : ''}</p>
            {(permError || error) && <div className="mt-4 flex gap-2 rounded-xl border border-warn/25 bg-warn/10 p-3 text-sm text-ink-2"><AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />{error || permError}</div>}
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Input label="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={60} required />
              {devices.video.length > 1 && (
                <label className="block"><span className="block text-xs font-medium text-ink-2 mb-1.5">Camera</span>
                  <select value={videoId} onChange={e => setVideoId(e.target.value)} className="w-full h-11 rounded-xl bg-surface-2 border px-3 text-sm text-ink">{devices.video.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>)}</select>
                </label>
              )}
              {devices.audio.length > 1 && (
                <label className="block"><span className="block text-xs font-medium text-ink-2 mb-1.5">Microphone</span>
                  <select value={audioId} onChange={e => setAudioId(e.target.value)} className="w-full h-11 rounded-xl bg-surface-2 border px-3 text-sm text-ink">{devices.audio.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)}</select>
                </label>
              )}
              <Button type="submit" size="lg" className="w-full" loading={joining} disabled={!name.trim()}>Join now</Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
