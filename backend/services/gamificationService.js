import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const TABLE = 'studymate_gamification'

const XP_REWARDS = { Easy: 50, Medium: 100, Hard: 200 }

const BADGES = [
  { id: 'first-blood', name: 'First Blood', description: 'Solve your first problem', icon: '🗡️', condition: (p) => p.totalSolved >= 1 },
  { id: 'ten-down', name: 'Ten Down', description: 'Solve 10 problems', icon: '🔟', condition: (p) => p.totalSolved >= 10 },
  { id: 'half-century', name: 'Half Century', description: 'Solve 50 problems', icon: '🏏', condition: (p) => p.totalSolved >= 50 },
  { id: 'centurion', name: 'Centurion', description: 'Solve 100 problems', icon: '💯', condition: (p) => p.totalSolved >= 100 },
  { id: 'easy-master', name: 'Easy Master', description: 'Solve all Easy problems', icon: '🟢', condition: (p) => p.easySolved >= 8 },
  { id: 'medium-master', name: 'Medium Master', description: 'Solve all Medium problems', icon: '🟡', condition: (p) => p.mediumSolved >= 10 },
  { id: 'hard-master', name: 'Hard Master', description: 'Solve all Hard problems', icon: '🔴', condition: (p) => p.hardSolved >= 7 },
  { id: 'streak-3', name: 'On Fire', description: '3 day streak', icon: '🔥', condition: (p) => p.maxStreak >= 3 },
  { id: 'streak-7', name: 'Week Warrior', description: '7 day streak', icon: '⚡', condition: (p) => p.maxStreak >= 7 },
  { id: 'streak-30', name: 'Monthly Monster', description: '30 day streak', icon: '👑', condition: (p) => p.maxStreak >= 30 },
  { id: 'polyglot', name: 'Polyglot', description: 'Use all 4 languages', icon: '🌐', condition: (p) => Object.keys(p.languageUsage || {}).length >= 4 },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Solve a problem in under 5 minutes', icon: '⏱️', condition: (p) => p.fastSolve === true },
  { id: 'contest-warrior', name: 'Contest Warrior', description: 'Participate in 5 contests', icon: '🏆', condition: (p) => (p.contestsJoined || 0) >= 5 },
  { id: 'bug-hunter', name: 'Bug Hunter', description: 'Use AI debugger 10 times', icon: '🐛', condition: (p) => (p.debugUses || 0) >= 10 },
  { id: 'level-10', name: 'Deca Level', description: 'Reach Level 10', icon: '🌟', condition: (p) => p.level >= 10 }
]

export const calculateLevel = (xp) => Math.floor(Math.sqrt(xp / 100))

const createDefaultProfile = (userId) => ({
  userId,
  xp: 0,
  level: 0,
  totalSolved: 0,
  easySolved: 0,
  mediumSolved: 0,
  hardSolved: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastActiveDate: null,
  badges: [],
  languageUsage: {},
  heatmap: {},
  fastSolve: false,
  contestsJoined: 0,
  debugUses: 0,
  xpHistory: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

export const getProfile = async (userId) => {
  try {
    const data = await dynamoDb.send(new GetCommand({
      TableName: TABLE,
      Key: { userId }
    }))

    if (data.Item) return data.Item

    const profile = createDefaultProfile(userId)
    await dynamoDb.send(new PutCommand({
      TableName: TABLE,
      Item: profile
    }))

    return profile
  } catch (err) {
    console.error('Gamification getProfile Error:', err)
    throw new Error('Failed to fetch gamification profile')
  }
}

export const awardXP = async (userId, xpAmount, reason = '', metadata = {}) => {
  try {
    const profile = await getProfile(userId)
    const newXP = (profile.xp || 0) + xpAmount
    const newLevel = calculateLevel(newXP)
    const today = new Date().toISOString().split('T')[0]

    const xpEntry = {
      amount: xpAmount,
      reason,
      date: today,
      timestamp: new Date().toISOString(),
      ...metadata
    }

    const xpHistory = [...(profile.xpHistory || []), xpEntry].slice(-100)

    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: 'SET xp = :xp, #lvl = :level, xpHistory = :history, updatedAt = :now',
      ExpressionAttributeNames: { '#lvl': 'level' },
      ExpressionAttributeValues: {
        ':xp': newXP,
        ':level': newLevel,
        ':history': xpHistory,
        ':now': new Date().toISOString()
      }
    }))

    const updatedProfile = { ...profile, xp: newXP, level: newLevel, xpHistory }
    const newBadges = await checkBadges(userId, updatedProfile)

    return {
      xpAwarded: xpAmount,
      totalXP: newXP,
      level: newLevel,
      previousLevel: profile.level || 0,
      leveledUp: newLevel > (profile.level || 0),
      newBadges
    }
  } catch (err) {
    console.error('Gamification awardXP Error:', err)
    throw new Error('Failed to award XP')
  }
}

export const updateStreak = async (userId) => {
  try {
    const profile = await getProfile(userId)
    const today = new Date().toISOString().split('T')[0]
    const lastActive = profile.lastActiveDate

    let newStreak = profile.currentStreak || 0
    let newMaxStreak = profile.maxStreak || 0

    if (lastActive === today) {
      return { currentStreak: newStreak, maxStreak: newMaxStreak, updated: false }
    }

    if (lastActive) {
      const lastDate = new Date(lastActive)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        newStreak += 1
      } else {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }

    newMaxStreak = Math.max(newMaxStreak, newStreak)

    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: 'SET currentStreak = :cs, maxStreak = :ms, lastActiveDate = :lad, updatedAt = :now',
      ExpressionAttributeValues: {
        ':cs': newStreak,
        ':ms': newMaxStreak,
        ':lad': today,
        ':now': new Date().toISOString()
      }
    }))

    return { currentStreak: newStreak, maxStreak: newMaxStreak, updated: true }
  } catch (err) {
    console.error('Gamification updateStreak Error:', err)
    throw new Error('Failed to update streak')
  }
}

export const checkBadges = async (userId, profile) => {
  try {
    const currentBadgeIds = (profile.badges || []).map(b => b.id)
    const newBadges = []

    for (const badge of BADGES) {
      if (!currentBadgeIds.includes(badge.id)) {
        try {
          if (badge.condition(profile)) {
            const earned = {
              id: badge.id,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              earnedAt: new Date().toISOString()
            }
            newBadges.push(earned)
          }
        } catch (e) {
          // Badge condition evaluation failed, skip
        }
      }
    }

    if (newBadges.length > 0) {
      const allBadges = [...(profile.badges || []), ...newBadges]

      await dynamoDb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { userId },
        UpdateExpression: 'SET badges = :badges, updatedAt = :now',
        ExpressionAttributeValues: {
          ':badges': allBadges,
          ':now': new Date().toISOString()
        }
      }))
    }

    return newBadges
  } catch (err) {
    console.error('Gamification checkBadges Error:', err)
    return []
  }
}

export const getAllBadges = () => {
  return BADGES.map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon
  }))
}

export const updateLanguageUsage = async (userId, language) => {
  try {
    const profile = await getProfile(userId)
    const langUsage = profile.languageUsage || {}
    langUsage[language] = (langUsage[language] || 0) + 1

    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: 'SET languageUsage = :lu, updatedAt = :now',
      ExpressionAttributeValues: {
        ':lu': langUsage,
        ':now': new Date().toISOString()
      }
    }))

    return langUsage
  } catch (err) {
    console.error('Gamification updateLanguageUsage Error:', err)
    throw new Error('Failed to update language usage')
  }
}

export const updateHeatmap = async (userId) => {
  try {
    const profile = await getProfile(userId)
    const today = new Date().toISOString().split('T')[0]
    const heatmap = profile.heatmap || {}
    heatmap[today] = (heatmap[today] || 0) + 1

    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: 'SET heatmap = :hm, updatedAt = :now',
      ExpressionAttributeValues: {
        ':hm': heatmap,
        ':now': new Date().toISOString()
      }
    }))

    return heatmap
  } catch (err) {
    console.error('Gamification updateHeatmap Error:', err)
    throw new Error('Failed to update heatmap')
  }
}

export { XP_REWARDS, BADGES }
