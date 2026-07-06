import { useState, useRef, useEffect } from 'react';
import { useChat, useLocalParticipant } from '@livekit/components-react';
import { Send, X } from 'lucide-react';

export default function ChatPanel({ onClose }) {
  const { chatMessages, send } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        await send(message.trim());
        setMessage('');
      } catch (err) {
        console.error("Failed to send message", err);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <h3 className="font-semibold text-slate-200">In-call Chat</h3>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {chatMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            No messages yet. Say hi!
          </div>
        ) : (
          chatMessages.map((msg, i) => {
            const isLocal = msg.from?.identity === localParticipant?.identity;
            
            return (
              <div key={msg.timestamp + i} className={`flex flex-col max-w-[85%] ${isLocal ? 'self-end' : 'self-start'}`}>
                <span className={`text-xs mb-1 ${isLocal ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                  {msg.from?.name || msg.from?.identity || 'Unknown'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isLocal ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
