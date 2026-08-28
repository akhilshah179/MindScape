import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import { Mic, MicOff, Camera, CameraOff, X } from 'lucide-react';

export default function ParticipantsPanel({ onClose }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <div className="h-full flex flex-col">
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <h3 className="font-semibold text-slate-200">Participants ({participants.length})</h3>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.map(p => {
          const isLocal = p.identity === localParticipant?.identity;
          
          return (
            <div key={p.identity} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-violet-900 text-violet-200 flex items-center justify-center font-bold shrink-0">
                  {p.name ? p.name[0].toUpperCase() : p.identity[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {p.name || p.identity} {isLocal && <span className="text-slate-500 text-xs">(You)</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {p.isSpeaking ? 'Speaking...' : 'Joined'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-slate-400 shrink-0">
                {p.isMicrophoneEnabled ? <Mic size={14} className="text-slate-300" /> : <MicOff size={14} className="text-red-400" />}
                {p.isCameraEnabled ? <Camera size={14} className="text-slate-300" /> : <CameraOff size={14} className="text-red-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
