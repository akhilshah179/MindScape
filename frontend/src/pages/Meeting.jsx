import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PreJoin from '../components/meeting/PreJoin';
import MeetingRoom from '../components/meeting/MeetingRoom';
import { fetchLiveKitToken } from '../utils/livekitToken';

export default function Meeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [preJoined, setPreJoined] = useState(false);
  const [token, setToken] = useState('');
  const [userChoices, setUserChoices] = useState({
    videoEnabled: true,
    audioEnabled: true,
    videoDeviceId: '',
    audioDeviceId: '',
    username: ''
  });

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-project.livekit.cloud';

  const handleJoin = async (choices) => {
    setUserChoices(choices);
    try {
      const fetchedToken = await fetchLiveKitToken(roomId, choices.username);
      setToken(fetchedToken);
      setPreJoined(true);
    } catch (err) {
      console.error("Failed to fetch token", err);
      alert("Failed to join meeting. Could not get access token.");
    }
  };

  const handleLeave = () => {
    navigate('/dashboard');
  };

  if (!preJoined) {
    return <PreJoin onJoin={handleJoin} roomId={roomId} />;
  }

  return (
    <MeetingRoom 
      token={token}
      url={livekitUrl}
      roomId={roomId}
      userChoices={userChoices}
      onLeave={handleLeave}
    />
  );
}
