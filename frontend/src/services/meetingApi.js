import { api } from '../lib/api'

export const createRoom = (title) => api.post('/meeting/rooms', { title }).then(r => r.data)
export const getRoom = (roomId) => api.get(`/meeting/rooms/${encodeURIComponent(roomId)}`).then(r => r.data)
export const getJoinToken = (roomId, displayName) => api.post(`/meeting/rooms/${encodeURIComponent(roomId)}/token`, { displayName }).then(r => r.data)

/** Accepts a code ("k3f9-x2qm-7hp4") or a full invite link. */
export function parseRoomCode(input) {
  const s = String(input || '').trim().toLowerCase()
  const fromUrl = /\/meetings?\/([a-z0-9-]{6,32})/.exec(s)?.[1]
  return fromUrl || (/^[a-z0-9-]{6,32}$/.test(s) ? s : null)
}

const RECENT_KEY = 'studymate_recent_rooms' // synced to the server by useCloudSync
export function rememberRoom(room) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(r => r.roomId !== room.roomId)
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ ...room, at: Date.now() }, ...list].slice(0, 8)))
  } catch { /* storage unavailable */ }
}
export function recentRooms() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
