import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export const generateToken = async (req, res) => {
    try {
        const { room, username } = req.query;
        
        if (!room || !username) {
            return res.status(400).json({ error: 'Missing room or username' });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret || apiKey.includes('your_api_key_here')) {
            return res.status(500).json({ error: 'LiveKit API credentials are not properly configured' });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: username,
            name: username,
        });

        at.addGrant({ roomJoin: true, room: room });

        const token = await at.toJwt();
        
        res.json({ token });
    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
};

export const createRoom = async (req, res) => {
    try {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.VITE_LIVEKIT_URL;

        if (!apiKey || !apiSecret || apiKey.includes('your_api_key_here') || !livekitUrl) {
            return res.status(500).json({ error: 'LiveKit API credentials are not properly configured' });
        }

        // The RoomServiceClient needs an HTTP URL, not WSS
        const livekitHost = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
        const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
        
        // Generate 6-8 character short code
        const roomId = Math.random().toString(36).substring(2, 8);
        
        const opts = {
            name: roomId,
            emptyTimeout: 10 * 60, // 10 minutes timeout if empty
            maxParticipants: 50,
        };
        
        await roomService.createRoom(opts);
        
        res.json({ roomId });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
};
