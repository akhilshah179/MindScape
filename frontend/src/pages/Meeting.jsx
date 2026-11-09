import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, PhoneOff } from 'lucide-react'
import PreJoin from '../components/meeting/PreJoin'
import MeetingRoom from '../components/meeting/MeetingRoom'
import { FullScreenLoader } from '../components/ProtectedRoute'
import { Button, Card, Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getJoinToken, getRoom, rememberRoom } from '../services/meetingApi'

function Notice({ icon: Icon = AlertTriangle, title, text, actions }) {
  return (
    <div className="min-h-[100dvh] bg-canvas flex flex-col">
      <header className="h-16 px-6 flex items-center"><Link to="/dashboard"><Logo /></Link></header>
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-2 border flex items-center justify-center"><Icon className="w-5 h-5 text-ink-2" /></div>
          <h1 className="font-display text-xl font-semibold text-ink mt-4">{title}</h1>
          <p className="text-sm text-ink-3 mt-2">{text}</p>
          <div className="mt-6 flex gap-2 justify-center">{actions}</div>
        </Card>
      </div>
    </div>
  )
}

export default function Meeting() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [session, setSession] = useState(null) // { token, url, choices }
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [ended, setEnded] = useState(null)

  useEffect(() => {
    getRoom(roomId).then(r => { setRoom(r); rememberRoom({ roomId: r.roomId, title: r.title }) }).catch(err => setLoadError(err))
  }, [roomId])

  const join = async (choices) => {
    setJoining(true)
    setJoinError(null)
    try {
      const { token, url } = await getJoinToken(roomId, choices.displayName)
      setEnded(null)
      setSession({ token, url, choices })
    } catch (err) {
      setJoinError(err.message)
    } finally { setJoining(false) }
  }

  if (loadError) {
    return <Notice title={loadError.status === 404 ? 'Meeting not found' : "Couldn't open this meeting"} text={loadError.status === 404 ? 'Check the code and try again. The link may be mistyped.' : loadError.message}
      actions={<Button onClick={() => navigate('/meetings')}>Back to meetings</Button>} />
  }
  if (!room) return <FullScreenLoader label="Opening meeting…" />
  if (ended) {
    return <Notice icon={PhoneOff} title={ended === 'left' ? 'You left the meeting' : 'You were disconnected'}
      text={ended === 'left' ? 'Thanks for studying together.' : 'The connection to the room was lost.'}
      actions={<><Button variant="secondary" onClick={() => navigate('/meetings')}>Back to meetings</Button><Button onClick={() => join(session.choices)} loading={joining}>Rejoin</Button></>} />
  }
  if (!session) return <PreJoin room={room} defaultName={user?.name} onJoin={join} joining={joining} error={joinError} />
  return <MeetingRoom room={room} token={session.token} url={session.url} choices={session.choices} onLeft={(reason) => setEnded(reason === 'left' ? 'left' : 'lost')} />
}
