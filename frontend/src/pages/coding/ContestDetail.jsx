import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CheckCircle2, Crown, Medal, Timer, Trophy, Users } from 'lucide-react'
import { useContest } from '../../hooks/coding/useContest'
import { Badge, Button, Card, EmptyState, Spinner, cx, useToast } from '../../components/ui'

const DIFF = { Easy: 'ok', Medium: 'warn', Hard: 'bad' }

function useCountdown(target) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const ms = Math.max(0, new Date(target) - now)
  const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1000) % 60
  return { ms, label: `${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` }
}

export default function ContestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useOutletContext() || {}
  const { toast } = useToast()
  const { contest, leaderboard, loading, error, loadContest, joinContest } = useContest(id)
  const [joining, setJoining] = useState(false)
  const status = contest?.status
  const countdown = useCountdown(status === 'upcoming' ? contest?.startTime : contest?.endTime)

  // Keep the leaderboard live while the contest runs
  useEffect(() => {
    if (status !== 'active') return
    const t = setInterval(() => loadContest({ quiet: true }), 15000)
    return () => clearInterval(t)
  }, [status, loadContest])
  // Flip status when the countdown hits zero
  useEffect(() => { if (contest && countdown.ms === 0 && status !== 'completed') loadContest({ quiet: true }) }, [countdown.ms === 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    setJoining(true)
    try { await joinContest(); toast('You joined the contest. Good luck!', 'success') } catch (err) { toast(err.message, 'error') } finally { setJoining(false) }
  }

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>
  if (error || !contest) return <EmptyState title="Contest unavailable" description={error} action={<Button onClick={() => navigate('/coding/contests')}>All contests</Button>} className="py-24" />

  const canSolve = contest.joined && status === 'active'
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <Link to="/coding/contests" className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink mb-4"><ArrowLeft className="w-4 h-4" />All contests</Link>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <Badge tone={status === 'active' ? 'ok' : status === 'upcoming' ? 'accent' : 'neutral'}>{status === 'active' ? '● Live' : status === 'upcoming' ? 'Upcoming' : 'Ended'}</Badge>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-2">{contest.title}</h1>
          {contest.description && <p className="text-sm text-ink-3 mt-1 max-w-2xl">{contest.description}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />{new Date(contest.startTime).toLocaleString()} – {new Date(contest.endTime).toLocaleString()}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{contest.participantCount} participants</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status !== 'completed' && <div className="text-right"><p className="text-[11px] text-ink-3">{status === 'upcoming' ? 'Starts in' : 'Ends in'}</p><p className="font-mono text-lg text-ink tabular-nums inline-flex items-center gap-1.5"><Timer className="w-4 h-4 text-accent-ink" />{countdown.label}</p></div>}
          {!contest.joined && status !== 'completed' && <Button icon={Trophy} loading={joining} onClick={join}>Join contest</Button>}
          {contest.joined && <Badge tone="accent">Joined · {contest.myScore ?? 0} pts</Badge>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <Card className="p-2">
          <p className="px-3 pt-3 pb-2 text-sm font-medium text-ink">Problems</p>
          {contest.problems.map((p, i) => (
            <button key={p.id} disabled={!canSolve && status !== 'completed'}
              onClick={() => navigate(status === 'completed' ? `/coding/problem/${p.id}` : `/coding/problem/${p.id}?contest=${contest.contestId}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 text-left disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed">
              <span className="w-7 h-7 rounded-lg bg-surface-3 text-xs font-semibold text-ink-2 flex items-center justify-center">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1 min-w-0 text-sm text-ink truncate">{p.title}</span>
              <Badge tone={DIFF[p.difficulty] || 'neutral'}>{p.difficulty}</Badge>
              <span className="text-xs text-ink-3 w-14 text-right tabular-nums">{p.points} pts</span>
              {p.solved ? <CheckCircle2 className="w-4 h-4 text-ok" aria-label="Solved" /> : <span className="w-4" />}
            </button>
          ))}
          {!contest.joined && status === 'active' && <p className="text-xs text-ink-3 px-3 py-2">Join the contest to start solving. Only solves made while joined count.</p>}
          {status === 'upcoming' && <p className="text-xs text-ink-3 px-3 py-2">Problems unlock when the contest starts.</p>}
        </Card>

        <Card className="p-2">
          <p className="px-3 pt-3 pb-2 text-sm font-medium text-ink flex items-center gap-2"><Trophy className="w-4 h-4 text-warn" />Leaderboard</p>
          {leaderboard.length === 0 ? <p className="text-sm text-ink-3 px-3 py-8 text-center">No participants yet.</p>
            : leaderboard.map(r => (
              <div key={r.userId} className={cx('flex items-center gap-3 px-3 h-12 rounded-xl', r.userId === user?.userId && 'bg-accent/10 border border-accent/20')}>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{r.rank === 1 ? <Crown className="w-4 h-4 text-warn mx-auto" /> : r.rank <= 3 ? <Medal className={cx('w-4 h-4 mx-auto', r.rank === 2 ? 'text-slate-300' : 'text-orange-400')} /> : <span className="text-ink-3">{r.rank}</span>}</span>
                <span className="flex-1 min-w-0 text-sm text-ink truncate">{r.userName}{r.userId === user?.userId ? ' (you)' : ''}</span>
                <span className="text-xs text-ink-3 tabular-nums">{r.solvedCount} solved</span>
                <span className="text-sm font-semibold text-ink tabular-nums w-14 text-right">{r.score}</span>
              </div>
            ))}
        </Card>
      </div>
    </div>
  )
}
