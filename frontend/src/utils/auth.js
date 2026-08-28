import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'

export async function getAuthUser() {
  try {
    const currentUser = await getCurrentUser()
    const attrs = await fetchUserAttributes().catch(() => ({}))
    const userId = currentUser?.userId || currentUser?.username
    const name = attrs.name || attrs.email?.split('@')[0] || userId || 'User'
    const email = attrs.email || userId || ''
    return { userId, name, email }
  } catch (err) {
    const stored = localStorage.getItem('studymate_user')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (_) {}
    }
    throw err
  }
}

export function setLocalUser(email, name) {
  const user = {
    userId: (email || 'user').replace(/[^a-zA-Z0-9]/g, '_'),
    email: email || '',
    name: name || (email ? email.split('@')[0] : 'User')
  }
  localStorage.setItem('studymate_user', JSON.stringify(user))
  return user
}

export function clearLocalUser() {
  localStorage.removeItem('studymate_user')
}
