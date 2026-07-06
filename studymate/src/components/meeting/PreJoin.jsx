import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Mic, MicOff, Settings } from 'lucide-react';
import { createLocalVideoTrack } from 'livekit-client';

export default function PreJoin({ onJoin, roomId }) {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [username, setUsername] = useState(() => 'Guest-' + Math.floor(Math.random() * 1000));
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  
  const videoRef = useRef(null);
  const [videoTrack, setVideoTrack] = useState(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const video = devices.filter(d => d.kind === 'videoinput');
        const audio = devices.filter(d => d.kind === 'audioinput');
        
        setVideoDevices(video);
        setAudioDevices(audio);
        
        if (video.length > 0) setSelectedVideo(video[0].deviceId);
        if (audio.length > 0) setSelectedAudio(audio[0].deviceId);
      } catch (err) {
        console.error("Error accessing devices", err);
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    let track;
    const startVideo = async () => {
      if (videoEnabled) {
        try {
          track = await createLocalVideoTrack({ deviceId: selectedVideo });
          setVideoTrack(track);
          if (videoRef.current) {
            track.attach(videoRef.current);
          }
        } catch (err) {
          console.error("Failed to create video track", err);
        }
      }
    };
    startVideo();

    return () => {
      if (track) {
        track.detach();
        track.stop();
      }
      setVideoTrack(null);
    };
  }, [videoEnabled, selectedVideo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (videoTrack) {
      videoTrack.detach();
      videoTrack.stop();
    }
    onJoin({
      videoEnabled,
      audioEnabled,
      videoDeviceId: selectedVideo,
      audioDeviceId: selectedAudio,
      username
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Preview Section */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {videoEnabled ? (
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <CameraOff size={48} className="mb-2" />
                <p>Camera is off</p>
              </div>
            )}
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button 
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-4 rounded-full transition-all shadow-lg backdrop-blur-md ${audioEnabled ? 'bg-slate-800/80 hover:bg-slate-700/80 text-white' : 'bg-red-500/90 hover:bg-red-600/90 text-white'}`}
              >
                {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              <button 
                type="button"
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-4 rounded-full transition-all shadow-lg backdrop-blur-md ${videoEnabled ? 'bg-slate-800/80 hover:bg-slate-700/80 text-white' : 'bg-red-500/90 hover:bg-red-600/90 text-white'}`}
              >
                {videoEnabled ? <Camera size={24} /> : <CameraOff size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white mb-2">Ready to join?</h1>
          <p className="text-slate-400 mb-8">Meeting ID: <span className="text-violet-400 font-mono">{roomId}</span></p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-slate-300 font-medium">
                <Settings size={18} />
                <span>Device Settings</span>
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">Microphone</label>
                <select 
                  value={selectedAudio} 
                  onChange={e => setSelectedAudio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Microphone'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Camera</label>
                <select 
                  value={selectedVideo} 
                  onChange={e => setSelectedVideo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {videoDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Camera'}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Join Now
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
