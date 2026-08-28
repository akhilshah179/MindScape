import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Copy, Loader2, ArrowRight } from 'lucide-react';

export default function MeetingModal({ onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('join'); // 'join' | 'create'
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateMeeting = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/meeting/create-room', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to create meeting');
      const data = await response.json();
      setCreatedRoomId(data.roomId);
    } catch (err) {
      console.error(err);
      setError('Could not create meeting. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a valid code or link.');
      return;
    }

    // Extract roomId if it's a full URL
    let roomId = joinCode.trim();
    if (roomId.includes('/meeting/')) {
      roomId = roomId.split('/meeting/')[1].split('/')[0];
    }
    
    // Clean up code (remove spaces, etc)
    roomId = roomId.replace(/[^a-zA-Z0-9-]/g, '');

    if (roomId.length < 3) {
      setError('Invalid meeting code.');
      return;
    }

    navigate(`/meeting/${roomId}`);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/meeting/${createdRoomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
              <Video size={20} />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-lg leading-tight">Live Meeting</h2>
              <p className="text-slate-500 text-sm">Study together in real-time</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors text-sm">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => { setActiveTab('join'); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'join' ? 'text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Join Meeting
            {activeTab === 'join' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600" />}
          </button>
          <button 
            onClick={() => { setActiveTab('create'); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'create' ? 'text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Create New
            {activeTab === 'create' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600" />}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

          {activeTab === 'join' ? (
            <form onSubmit={handleJoinMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting Code or Link</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. abc-123 or https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold py-3 rounded-2xl transition-colors shadow-sm"
              >
                Join Meeting <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {!createdRoomId ? (
                <>
                  <p className="text-sm text-slate-600 text-center mb-2">Create a secure, real-time video room to study with your peers.</p>
                  <button 
                    onClick={handleCreateMeeting}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-2xl transition-colors shadow-sm"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
                    {loading ? 'Creating...' : 'Start Instant Meeting'}
                  </button>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4 text-center">
                    <p className="text-emerald-800 font-semibold mb-1">Meeting created successfully!</p>
                    <p className="text-emerald-600 text-xs">Share this code with others to let them join.</p>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">Meeting Code</p>
                      <p className="text-lg font-mono font-bold text-slate-800 tracking-wider">{createdRoomId}</p>
                    </div>
                    <button 
                      onClick={copyLink}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      {copied ? 'Copied!' : <><Copy size={14} /> Copy Link</>}
                    </button>
                  </div>

                  <button 
                    onClick={() => navigate(`/meeting/${createdRoomId}`)}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-2xl transition-colors shadow-sm"
                  >
                    Enter Room <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
