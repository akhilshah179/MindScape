import { useState, useEffect, useCallback } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router-dom'
import CodeEditor from './CodeEditor'
import { LANGUAGES } from '../../services/coding/problems'

export default function LiveCodingRoom() {
  const { roomId } = useParams()
  const { user } = useOutletContext() || {}
  const navigate = useNavigate()
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('# Collaborative coding session\n# Start writing code here...\n')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [participants, setParticipants] = useState([{ name: user?.name || 'You', isHost: true }])

  // Simulated participant join
  useEffect(() => {
    const timer = setTimeout(() => {
      setChatMessages([{ sender: 'System', message: `Room ${roomId} is active. Share the room ID to invite others.`, time: new Date().toLocaleTimeString() }])
    }, 500)
    return () => clearTimeout(timer)
  }, [roomId])

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, { sender: user?.name || 'You', message: chatInput, time: new Date().toLocaleTimeString() }])
    setChatInput('')
  }, [chatInput, user])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#08080d] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/coding')} className="text-white/30 hover:text-white/60 text-xs">← Back</button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-white/80">Room: {roomId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Participants */}
          <div className="flex -space-x-2">
            {participants.map((p, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border-2 border-[#08080d] flex items-center justify-center text-[9px] text-white/60 font-semibold">
                {p.name[0].toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-white/20">{participants.length} online</span>

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] text-white/50 focus:outline-none"
          >
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code editor */}
        <div className="flex-1">
          <CodeEditor
            language={language}
            value={code}
            onChange={setCode}
          />
        </div>

        {/* Chat sidebar */}
        <div className="w-72 bg-[#08080d] border-l border-white/[0.06] flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/50">💬 Chat</h3>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`font-semibold ${msg.sender === 'System' ? 'text-amber-400/60' : 'text-indigo-400/80'}`}>{msg.sender}</span>
                  <span className="text-white/10 text-[9px]">{msg.time}</span>
                </div>
                <p className="text-white/50 leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Message..."
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/60 placeholder-white/15 focus:outline-none focus:border-indigo-500/20"
              />
              <button onClick={sendChat} className="px-3 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs">↑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
