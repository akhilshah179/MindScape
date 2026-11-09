import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CheckSquare, Plus, Square, Trophy, Users } from 'lucide-react'
import { useContests } from '../../hooks/coding/useContest'
import { fetchProblems } from '../../services/coding/codingApi'
import { Badge, Button, Card, EmptyState, Input, Modal, Segmented, Skeleton, cx, useToast } from '../../components/ui'

const DIFF = { Easy: 'ok', Medium: 'warn', Hard: 'bad' }
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

function CreateContest({ open, onClose, onCreate }) {
  const { toast } = useToast()
  const [problems, setProblems] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', startMode: 'now', start: localInput(new Date(Date.now() + 3600e3)), duration: 60, picked: [] })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open && !problems) fetchProblems().then(d => setProblems(d.problems)).catch(e => toast(e.message, 'error')) }, [open, problems, toast])
  const toggle = (id) => setForm(f => ({ ...f, picked: f.picked.includes(id) ? f.picked.filter(x => x !== id) : [...f.picked, id].slice(0, 10) }))
  const submit = async (e) => {
    e.preventDefault()
    const start = form.startMode === 'now' ? new Date() : new Date(form.start)
    if (form.startMode !== 'now' && start < new Date()) return toast('Start time must be in the future.', 'error')
    setSaving(true)
    try {
      const res = await onCreate({
        title: form.title.trim(), description: form.description.trim(), problemIds: form.picked,
        startTime: start.toISOString(), endTime: new Date(start.getTime() + form.duration * 60000).toISOString()
      })
      onClose(res)
    } catch (err) { toast(err.message, 'error') } finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={() => onClose()} title="Create a contest" size="lg">
      <form onSubmit={submit} className="p-6 space-y-4">
        <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Weekly challenge #1" maxLength={120} required />
        <Input label="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={500} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-ink-2 mb-1.5">Start</p>
            <Segmented layoutId="contest-start" value={form.startMode} onChange={v => setForm({ ...form, startMode: v })} options={[{ value: 'now', label: 'Now' }, { value: 'later', label: 'Schedule' }]} />
            {form.startMode === 'later' && <input type="datetime-local" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="mt-2 w-full h-10 rounded-xl bg-surface-2 border px-3 text-sm text-ink" aria-label="Start time" />}
          </div>
          <label className="block"><span className="block text-xs font-medium text-ink-2 mb-1.5">Duration</span>
            <select value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} className="w-full h-10 rounded-xl bg-surface-2 border px-3 text-sm text-ink">
              {[30, 60, 90, 120, 180, 1440].map(m => <option key={m} value={m}>{m < 60 ? `${m} minutes` : m === 1440 ? '24 hours' : `${m / 60} hour${m > 60 ? 's' : ''}`}</option>)}
            </select>
          </label>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-2 mb-1.5">Problems <span className="text-ink-3 font-normal">({form.picked.length}/10 selected)</span></p>
          <div className="max-h-64 overflow-y-auto thin-scroll border rounded-xl p-1">
            {!problems ? [0, 1, 2, 3].map(i => <Skeleton key={i} className="h-9 m-1" />) : problems.map(p => {
              const on = form.picked.includes(p.id)
              return (
                <button type="button" key={p.id} onClick={() => toggle(p.id)} className={cx('w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-left text-sm', on ? 'bg-accent/10' : 'hover:bg-surface-2')}>
                  {on ? <CheckSquare className="w-4 h-4 text-accent-ink" /> : <Square className="w-4 h-4 text-ink-3" />}
                  <span className="flex-1 text-ink truncate">{p.title}</span><Badge tone={DIFF[p.difficulty]}>{p.difficulty}</Badge>
                </button>
              )
            })}
          </div>
        </div>
        <Button type="submit" className="w-full" loading={saving} disabled={!form.title.trim() || !form.picked.length}>Create contest</Button>
      </form>
    </Modal>
  )
}

export default function ContestsPage() {
  const navigate = useNavigate()
  const { contests, loading, error, loadContests, createContest } = useContests()
  const [tab, setTab] = useState('active')
  const [creating, setCreating] = useState(false)
  useEffect(() => { loadContests() }, [loadContests])

  const groups = useMemo(() => ({
    active: contests.filter(c => c.status === 'active'),
    upcoming: contests.filter(c => c.status === 'upcoming'),
    completed: contests.filter(c => c.status === 'completed'),
  }), [contests])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Contests</h1>
          <p className="text-sm text-ink-3 mt-1">Timed challenges with a live leaderboard. Points: Easy 100 · Medium 200 · Hard 300.</p>
        </div>
        <Button icon={Plus} onClick={() => setCreating(true)}>Create</Button>
      </div>
      <Segmented layoutId="contest-tab" value={tab} onChange={setTab} options={[
        { value: 'active', label: `Live (${groups.active.length})` }, { value: 'upcoming', label: `Upcoming (${groups.upcoming.length})` }, { value: 'completed', label: 'Past' }]} />
      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        {loading ? [0, 1].map(i => <Skeleton key={i} className="h-32" />)
          : error ? <p className="text-sm text-bad">{error}</p>
            : groups[tab].length === 0 ? <div className="sm:col-span-2"><EmptyState icon={Trophy} title={`No ${tab === 'active' ? 'live' : tab} contests`} description="Create one and invite your classmates." /></div>
              : groups[tab].map(c => (
                <Card key={c.contestId} as="button" interactive onClick={() => navigate(`/coding/contest/${c.contestId}`)} className="p-5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={c.status === 'active' ? 'ok' : c.status === 'upcoming' ? 'accent' : 'neutral'}>{c.status === 'active' ? '● Live' : c.status === 'upcoming' ? 'Upcoming' : 'Ended'}</Badge>
                    {c.joined && <Badge tone="accent">Joined</Badge>}
                  </div>
                  <p className="font-semibold text-ink mt-3 truncate">{c.title}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-3">
                    <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{new Date(c.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span>{c.problemCount} problems</span>
                    <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.participantCount}</span>
                  </div>
                </Card>
              ))}
      </div>
      <CreateContest open={creating} onCreate={createContest} onClose={(res) => { setCreating(false); if (res?.contestId) navigate(`/coding/contest/${res.contestId}`) }} />
    </div>
  )
}
