export async function fetchLiveKitToken(roomId, participantName) {
  try {
    const response = await fetch(`http://localhost:5000/api/meeting/token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(participantName)}`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch token');
    }
    const data = await response.json();
    return data.token;
  } catch (err) {
    console.error("LiveKit token fetch error:", err);
    throw err;
  }
}
