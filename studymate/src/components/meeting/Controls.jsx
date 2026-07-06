import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Mic, MicOff, Camera, CameraOff, MonitorUp, PhoneOff } from 'lucide-react';

export default function Controls({ onLeave }) {
  const room = useRoomContext();
  const { 
    isMicrophoneEnabled, 
    isCameraEnabled, 
    isScreenShareEnabled, 
    localParticipant 
  } = useLocalParticipant();

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const toggleCam = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  };

  const toggleScreen = async () => {
    if (localParticipant) {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    }
  };

  const handleLeave = async () => {
    if (room) {
      await room.disconnect();
    }
    onLeave();
  };
  
  return (
    <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 px-6">
      
      {/* Microphone Toggle */}
      <button 
        onClick={toggleMic} 
        className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center w-12 h-12 ${isMicrophoneEnabled ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
        title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
      >
        {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      {/* Camera Toggle */}
      <button 
        onClick={toggleCam} 
        className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center w-12 h-12 ${isCameraEnabled ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
        title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
      >
        {isCameraEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
      </button>

      {/* Screen Share Toggle */}
      <button 
        onClick={toggleScreen} 
        className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center w-12 h-12 ${isScreenShareEnabled ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
        title={isScreenShareEnabled ? "Stop Sharing" : "Share Screen"}
      >
        <MonitorUp size={20} />
      </button>

      <div className="w-px h-8 bg-slate-800 mx-2"></div>

      {/* Leave Button */}
      <button 
        onClick={handleLeave}
        className="px-6 h-12 bg-red-600 hover:bg-red-500 text-white font-medium rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"
      >
        <PhoneOff size={18} />
        <span className="hidden sm:inline">Leave</span>
      </button>

    </div>
  );
}
