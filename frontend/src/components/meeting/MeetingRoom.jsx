import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LiveKitRoom, RoomAudioRenderer, VideoTrack, useChat, useConnectionState, useIsSpeaking, useLocalParticipant,
  useParticipants, useTracks, useConnectionQualityIndicator, isTrackReference
} from '@livekit/components-react'
import { ConnectionState, Track, ConnectionQuality } from 'livekit-client'
import { Check, Copy, Crown, Link2, MessageSquare, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Send, Users, Video, VideoOff, WifiOff, X } from 'lucide-react'
import { Avatar, Spinner, cx } from '../ui'

const meta = (p) => { try { return JSON.parse(p.metadata || '{}') } catch { return {} } }

function Tile({ trackRef, featured }) {
  const p = trackRef.participant
  const speaking = useIsSpeaking(p)
  const { quality } = useConnectionQualityIndicator({ participant: p })
  const isScreen = trackRef.source === Track.Source.ScreenShare
  const hasVideo = isTrackReference(trackRef) && trackRef.publication && !trackRef.publication.isMuted
  const name = p.name || p.identity.split('#')[0]
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className={cx('relative rounded-2xl overflow-hidden bg-[#14151d] min-h-0 transition-shadow duration-200', speaking && !isScreen ? 'ring-2 ring-accent shadow-glow' : 'ring-1 ring-white/5')}>
      {hasVideo
        ? <VideoTrack trackRef={trackRef} className={cx('absolute inset-0 w-full h-full', isScreen ? 'object-contain bg-black' : 'object-cover', p.isLocal && !isScreen && '-scale-x-100')} />
        : <div className="absolute inset-0 flex items-center justify-center"><Avatar name={name} className={cx(featured ? 'w-28 h-28 text-3xl' : 'w-16 h-16 sm:w-20 sm:h-20 text-xl')} /></div>}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
        <span className="max-w-full inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-black/55 backdrop-blur text-white text-xs font-medium">
          {meta(p).isHost && <Crown className="w-3 h-3 text-amber-300 shrink-0" aria-label="Host" />}
          {isScreen && <MonitorUp className="w-3 h-3 shrink-0" />}
          <span className="truncate">{name}{p.isLocal ? ' (you)' : ''}{isScreen ? ' · screen' : ''}</span>
          {!isScreen && !p.isMicrophoneEnabled && <MicOff className="w-3 h-3 text-red-300 shrink-0" aria-label="Muted" />}
        </span>
        {quality === ConnectionQuality.Poor && <span className="ml-auto px-2 h-7 rounded-lg bg-black/55 text-amber-300 text-[11px] inline-flex items-center gap-1"><WifiOff className="w-3 h-3" />Weak</span>}
      </div>
    </motion.div>
  )
}

function Stage() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false })
  const screen = tracks.find(t => t.source === Track.Source.ScreenShare && isTrackReference(t))
  const cams = tracks.filter(t => t !== screen)
  const n = cams.length
  const cols = n <= 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-1 sm:grid-cols-2' : n <= 4 ? 'grid-cols-2' : n <= 9 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3 md:grid-cols-4'

  if (screen) {
    // Spotlight layout: shared screen large, cameras in a strip
    return (
      <div className="h-full flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-h-0 grid"><Tile trackRef={screen} featured /></div>
        <div className="flex lg:flex-col gap-3 lg:w-60 overflow-auto thin-scroll shrink-0 h-32 lg:h-auto">
          {cams.map(t => <div key={t.participant.identity + t.source} className="w-48 lg:w-full aspect-video shrink-0 grid"><Tile trackRef={t} /></div>)}
        </div>
      </div>
    )
  }
  return (
    <div className={cx('h-full grid gap-3 auto-rows-fr', cols, n === 1 && 'max-w-5xl mx-auto w-full')}>
      <AnimatePresence>{cams.map(t => <Tile key={t.participant.identity + t.source} trackRef={t} featured={n === 1} />)}</AnimatePresence>
    </div>
  )
}

function ChatPanel({ onClose }) {
  const { chatMessages, send, isSending } = useChat()
  const [text, setText] = useState('')
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [chatMessages.length])
  const submit = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(''); await send(t) }
  return (
    <div className="h-full flex flex-col">
      <PanelHeader title="Chat" onClose={onClose} />
      <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3 space-y-3">
        {chatMessages.length === 0 && <p className="text-xs text-white/40 text-center py-8">Messages are visible to everyone in the room and aren't saved after the meeting.</p>}
        {chatMessages.map((m, i) => {
          const mine = m.from?.isLocal
          return (
            <div key={m.id || i} className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <span className="text-[10px] text-white/40 mb-0.5">{mine ? 'You' : (m.from?.name || 'Guest')} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className={cx('max-w-[90%] px-3 py-2 rounded-2xl text-sm break-words', mine ? 'bg-accent text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md')}>{m.message}</span>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="p-3 border-t border-white/10 flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Send a message" maxLength={1000} aria-label="Chat message"
          className="flex-1 h-10 rounded-xl bg-white/10 border border-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent/60" />
        <button disabled={!text.trim() || isSending} className="w-10 h-10 rounded-xl bg-accent-gradient text-white flex items-center justify-center disabled:opacity-40" aria-label="Send"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  )
}

function ParticipantsPanel({ onClose }) {
  const participants = useParticipants()
  return (
    <div className="h-full flex flex-col">
      <PanelHeader title={`People (${participants.length})`} onClose={onClose} />
      <div className="flex-1 overflow-y-auto thin-scroll p-2">
        {participants.map(p => (
          <div key={p.identity} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5">
            <Avatar name={p.name || p.identity} />
            <span className="flex-1 min-w-0 text-sm text-white truncate">{p.name || p.identity.split('#')[0]}{p.isLocal ? ' (you)' : ''}</span>
            {meta(p).isHost && <Crown className="w-3.5 h-3.5 text-amber-300" aria-label="Host" />}
            {p.isMicrophoneEnabled ? <Mic className="w-4 h-4 text-white/60" /> : <MicOff className="w-4 h-4 text-red-300" />}
            {p.isCameraEnabled ? <Video className="w-4 h-4 text-white/60" /> : <VideoOff className="w-4 h-4 text-white/30" />}
          </div>
        ))}
      </div>
    </div>
  )
}

const PanelHeader = ({ title, onClose }) => (
  <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10">
    <p className="text-sm font-medium text-white">{title}</p>
    <button onClick={onClose} className="w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center" aria-label="Close panel"><X className="w-4 h-4" /></button>
  </div>
)

function CtrlButton({ on = true, danger, onClick, label, Icon, OffIcon, badge, active }) {
  const I = on ? Icon : (OffIcon || Icon)
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={active}
      className={cx('relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95',
        danger ? 'bg-bad text-white hover:brightness-110 w-16' : !on ? 'bg-bad/90 text-white hover:bg-bad' : active ? 'bg-accent text-white' : 'bg-white/10 text-white hover:bg-white/20')}>
      <I className="w-5 h-5" />
      {badge ? <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-accent text-[10px] font-semibold text-white flex items-center justify-center">{badge}</span> : null}
    </button>
  )
}

function RoomUI({ room, onLeave }) {
  const state = useConnectionState()
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant()
  const participants = useParticipants()
  const { chatMessages } = useChat()
  const [panel, setPanel] = useState(null)
  const [seen, setSeen] = useState(0)
  const [copied, setCopied] = useState(false)
  const [mediaError, setMediaError] = useState(null)
  const unread = panel === 'chat' ? 0 : Math.max(0, chatMessages.length - seen)
  useEffect(() => { if (panel === 'chat') setSeen(chatMessages.length) }, [panel, chatMessages.length])

  const toggle = (fn) => async () => {
    try { setMediaError(null); await fn() } catch (err) { setMediaError(err.name === 'NotAllowedError' ? 'Permission denied by the browser.' : err.message) }
  }
  const invite = `${window.location.origin}/meetings/${room.roomId}`
  const copy = () => navigator.clipboard?.writeText(invite).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })

  if (state === ConnectionState.Connecting) {
    return <div className="h-full flex flex-col items-center justify-center gap-3 text-white/70"><Spinner />Connecting to the room…</div>
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{room.title || 'Meeting'}</p>
            <button onClick={copy} className="text-xs text-white/50 hover:text-white font-mono inline-flex items-center gap-1.5">
              {room.roomId}{copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <button onClick={copy} className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium"><Link2 className="w-4 h-4" />{copied ? 'Copied!' : 'Copy invite link'}</button>
        </header>

        <AnimatePresence>
          {state === ConnectionState.Reconnecting && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="mx-4 sm:mx-6 mb-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm px-4 py-2 flex items-center gap-2"><Spinner className="w-4 h-4 text-amber-300" />Connection lost. Reconnecting…</div>
            </motion.div>
          )}
          {mediaError && <div className="mx-4 sm:mx-6 mb-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm px-4 py-2">{mediaError}</div>}
        </AnimatePresence>

        <div className="flex-1 min-h-0 px-3 sm:px-6">
          {participants.length === 1 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-24 z-10 rounded-full bg-white/10 backdrop-blur px-4 h-9 flex items-center text-xs text-white/80">You're the only one here. Share the invite link to bring people in.</div>
          )}
          <Stage />
        </div>

        <footer className="h-20 shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4">
          <CtrlButton on={isMicrophoneEnabled} Icon={Mic} OffIcon={MicOff} label={isMicrophoneEnabled ? 'Mute' : 'Unmute'} onClick={toggle(() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))} />
          <CtrlButton on={isCameraEnabled} Icon={Video} OffIcon={VideoOff} label={isCameraEnabled ? 'Stop camera' : 'Start camera'} onClick={toggle(() => localParticipant.setCameraEnabled(!isCameraEnabled))} />
          <span className="hidden sm:block"><CtrlButton active={isScreenShareEnabled} Icon={isScreenShareEnabled ? MonitorX : MonitorUp} label={isScreenShareEnabled ? 'Stop sharing' : 'Share screen'} onClick={toggle(() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled))} /></span>
          <CtrlButton active={panel === 'chat'} Icon={MessageSquare} label="Chat" badge={unread} onClick={() => setPanel(p => (p === 'chat' ? null : 'chat'))} />
          <CtrlButton active={panel === 'people'} Icon={Users} label="People" badge={participants.length > 1 ? participants.length : 0} onClick={() => setPanel(p => (p === 'people' ? null : 'people'))} />
          <CtrlButton danger Icon={PhoneOff} label="Leave meeting" onClick={onLeave} />
        </footer>
      </div>

      <AnimatePresence>
        {panel && (
          <motion.aside initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed sm:static inset-0 sm:inset-auto z-40 sm:z-auto w-full sm:w-[340px] shrink-0 bg-[#101119] sm:border-l border-white/10">
            {panel === 'chat' ? <ChatPanel onClose={() => setPanel(null)} /> : <ParticipantsPanel onClose={() => setPanel(null)} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MeetingRoom({ room, token, url, choices, onLeft }) {
  const options = useMemo(() => ({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: choices.videoDeviceId ? { deviceId: choices.videoDeviceId } : undefined,
    audioCaptureDefaults: choices.audioDeviceId ? { deviceId: choices.audioDeviceId, echoCancellation: true, noiseSuppression: true } : undefined,
  }), [choices.videoDeviceId, choices.audioDeviceId])
  const [leaving, setLeaving] = useState(false)

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={!leaving}
      video={choices.videoEnabled}
      audio={choices.audioEnabled}
      options={options}
      onDisconnected={(reason) => onLeft(leaving ? 'left' : reason)}
      onError={(err) => console.error('[meeting]', err)}
      className="h-[100dvh] bg-[#0a0b10] text-white"
    >
      <RoomAudioRenderer />
      <RoomUI room={room} onLeave={() => setLeaving(true)} />
    </LiveKitRoom>
  )
}
