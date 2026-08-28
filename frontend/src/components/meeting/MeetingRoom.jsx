import { useState } from 'react';
import { LiveKitRoom, useTracks, RoomAudioRenderer, useConnectionState } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Controls from './Controls';
import ParticipantsPanel from './ParticipantsPanel';
import ChatPanel from './ChatPanel';
import VideoTile from './VideoTile';
import { Users, MessageSquare } from 'lucide-react';
import '@livekit/components-styles';

export default function MeetingRoom({ token, url, roomId, userChoices, onLeave }) {
  const [activePanel, setActivePanel] = useState(null); // 'participants' | 'chat' | null

  return (
    <LiveKitRoom
      video={userChoices.videoEnabled}
      audio={userChoices.audioEnabled}
      token={token}
      serverUrl={url}
      onDisconnected={onLeave}
      className="flex h-screen bg-slate-950 text-slate-100 font-sans"
    >
      <RoomAudioRenderer />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative transition-all duration-300 min-w-0">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900/50 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="font-bold text-sm">SM</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">Meeting Room</h2>
              <p className="text-xs text-slate-400 font-mono">{roomId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActivePanel(p => p === 'participants' ? null : 'participants')}
              className={`p-2 rounded-xl transition-colors ${activePanel === 'participants' ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:bg-slate-800'}`}
              title="Participants"
            >
              <Users size={20} />
            </button>
            <button 
              onClick={() => setActivePanel(p => p === 'chat' ? null : 'chat')}
              className={`p-2 rounded-xl transition-colors ${activePanel === 'chat' ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:bg-slate-800'}`}
              title="Chat"
            >
              <MessageSquare size={20} />
            </button>
          </div>
        </header>

        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-hidden relative">
          <MeetingGrid />
        </div>

        {/* Bottom Controls */}
        <Controls onLeave={onLeave} />
      </div>

      {/* Side Panels */}
      {activePanel === 'participants' && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
          <ParticipantsPanel onClose={() => setActivePanel(null)} />
        </div>
      )}
      {activePanel === 'chat' && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
          <ChatPanel onClose={() => setActivePanel(null)} />
        </div>
      )}
      
    </LiveKitRoom>
  );
}

function MeetingGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  
  const connectionState = useConnectionState();
  
  if (connectionState === 'connecting') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Connecting to secure room...</p>
      </div>
    );
  }

  if (connectionState === 'disconnected') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <p className="text-red-400 font-semibold mb-2">Connection failed or token invalid</p>
        <p className="text-sm text-slate-500">
          This demo requires a real LiveKit server and a valid token. 
          Please implement the backend token generation in <code className="bg-slate-800 px-1 rounded text-violet-300">src/utils/livekitToken.js</code>.
        </p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
          Waiting for others to join...
        </div>
      </div>
    );
  }

  // Calculate grid columns based on participant count
  let gridClass = "grid-cols-1";
  if (tracks.length === 2) gridClass = "grid-cols-1 sm:grid-cols-2";
  else if (tracks.length >= 3 && tracks.length <= 4) gridClass = "grid-cols-2";
  else if (tracks.length > 4) gridClass = "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={`w-full h-full grid ${gridClass} gap-4 auto-rows-fr`}>
      {tracks.map((trackRef) => (
        <VideoTile key={trackRef.participant.identity + trackRef.source} trackRef={trackRef} />
      ))}
    </div>
  );
}
