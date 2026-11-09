import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Link2, Plus, ShieldCheck, Users, Video } from 'lucide-react'
import { Button, Card, Input, useToast } from '../components/ui'
import { createRoom, parseRoomCode, recentRooms, rememberRoom } from '../services/meetingApi'

export default function Meetings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)
  const recent = recentRooms()

  const create = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const room = await createRoom(title.trim())
      rememberRoom({ roomId: room.roomId, title: room.title })
      navigate(`/meetings/${room.roomId}`)
    } catch (err) {
      toast(err.message, 'error')
    } finally { setCreating(false) }
  }
  const join = (e) => {
    e.preventDefault()
    const id = parseRoomCode(code)
    if (!id) return toast('Enter a meeting code like k3f9-x2qm-7hp4, or paste an invite link.', 'error')
    navigate(`/meetings/${id}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-accent-ink bg-accent/10 border border-accent/20 rounded-full px-3 h-7"><Video className="w-3.5 h-3.5" />Study rooms</span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink mt-4">Study together, face to face.</h1>
        <p className="text-ink-3 mt-2">HD video, screen sharing and chat for group study and project work. Rooms are private to people with the code.</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient text-white flex items-center justify-center shadow-glow"><Plus className="w-5 h-5" /></div>
          <p className="font-semibold text-ink mt-4">Start a new meeting</p>
          <p className="text-sm text-ink-3 mt-1">You'll be the host. Share the code or link to invite others.</p>
          <form onSubmit={create} className="mt-5 space-y-3">
            <Input placeholder="Meeting name (optional)" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} aria-label="Meeting name" />
            <Button type="submit" className="w-full" loading={creating} icon={Video}>Create meeting</Button>
          </form>
        </Card>
        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border text-ink flex items-center justify-center"><Link2 className="w-5 h-5" /></div>
          <p className="font-semibold text-ink mt-4">Join with a code</p>
          <p className="text-sm text-ink-3 mt-1">Paste the meeting code or the full invite link.</p>
          <form onSubmit={join} className="mt-5 space-y-3">
            <Input placeholder="k3f9-x2qm-7hp4" value={code} onChange={e => setCode(e.target.value)} aria-label="Meeting code" className="[&_input]:font-mono" />
            <Button type="submit" variant="secondary" className="w-full" iconRight={ArrowRight} disabled={!code.trim()}>Join meeting</Button>
          </form>
        </Card>
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <p className="text-sm font-medium text-ink mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-ink-3" />Recent rooms</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recent.map(r => (
              <button key={r.roomId} onClick={() => navigate(`/meetings/${r.roomId}`)} className="card p-4 text-left hover:border-accent/30 transition-colors">
                <p className="text-sm text-ink truncate">{r.title || 'Untitled meeting'}</p>
                <p className="text-xs text-ink-3 font-mono mt-1">{r.roomId}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-12 text-sm">
        {[[ShieldCheck, 'Signed-in only', 'Every participant is verified by their MindScape account.'], [Users, 'Up to 50 people', 'Adaptive video keeps big groups smooth.'], [Video, 'Screen sharing', 'Present slides, code or notes to the room.']].map(([Icon, t, d]) => (
          <div key={t} className="flex gap-3"><Icon className="w-5 h-5 text-accent-ink shrink-0" /><div><p className="text-ink font-medium">{t}</p><p className="text-ink-3 mt-0.5">{d}</p></div></div>
        ))}
      </div>
    </div>
  )
}
