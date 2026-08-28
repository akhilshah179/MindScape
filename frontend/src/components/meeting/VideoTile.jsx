import { VideoTrack, AudioTrack, useIsSpeaking } from '@livekit/components-react';
import { MicOff } from 'lucide-react';
import { Track } from 'livekit-client';

export default function VideoTile({ trackRef }) {
  const participant = trackRef.participant;
  
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;
  const isVideo = trackRef.source === Track.Source.Camera || isScreenShare;
  
  // Check if participant is speaking
  const isSpeaking = useIsSpeaking(participant);

  return (
    <div className={`relative bg-slate-900 rounded-3xl overflow-hidden border-2 transition-all shadow-lg ${isSpeaking ? 'border-violet-500' : 'border-slate-800'}`}>
      
      {/* Video Content */}
      <div className="w-full h-full flex items-center justify-center">
        {isVideo ? (
          <VideoTrack 
            trackRef={trackRef} 
            className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-cover'}`} 
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-400">
            {participant.identity ? participant.identity[0].toUpperCase() : participant.name ? participant.name[0].toUpperCase() : 'U'}
          </div>
        )}
      </div>

      {/* Audio Rendering (if this is an audio track and not local) */}
      {!trackRef.participant.isLocal && trackRef.source === Track.Source.Microphone && (
        <AudioTrack trackRef={trackRef} />
      )}

      {/* Overlay - Name & Status */}
      <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 max-w-[90%]">
        <span className="text-sm font-medium text-white truncate">
          {participant.name || participant.identity} {participant.isLocal && '(You)'}
        </span>
        
        {/* Mic Status */}
        {!participant.isMicrophoneEnabled && (
          <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <MicOff size={12} />
          </div>
        )}
      </div>
      
    </div>
  );
}
