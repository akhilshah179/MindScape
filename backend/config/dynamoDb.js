import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import dotenv from 'dotenv'

dotenv.config()

// AWS picks up AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY from env automatically
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
})

const dynamoDb = DynamoDBDocumentClient.from(client)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_DB_PATH = path.join(__dirname, '..', 'local-db.json')

// Initialize local DB if it doesn't exist
if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({
        studymate_gamification: {},
        studymate_submissions: []
    }))
}

const readDb = () => {
    try {
        return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'))
    } catch {
        return {}
    }
}

const writeDb = (data) => fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2))

const getTable = (db, tableName) => {
    if (!db[tableName]) {
        // Use object for gamification and chats to allow key lookups, array for others
        if (tableName.includes('gamification') || tableName.includes('_chats')) {
            db[tableName] = {}
        } else {
            db[tableName] = []
        }
    }
    return db[tableName]
}

const originalSend = dynamoDb.send.bind(dynamoDb)
dynamoDb.send = async (command) => {
    try {
        return await originalSend(command)
    } catch (err) {
        if (err.name === 'CredentialsProviderError' || err.message.includes('credentials')) {
            const db = readDb()
            const tableName = command.input.TableName
            const type = command.constructor.name

            if (type === 'PutCommand') {
                const table = getTable(db, tableName)
                if (Array.isArray(table)) {
                    table.push(command.input.Item)
                } else {
                    const item = command.input.Item
                    const key = item.chatId || item.userId || item.id || 'default'
                    table[key] = item
                }
                writeDb(db)
                return {}
            }
            
            if (type === 'GetCommand') {
                const table = getTable(db, tableName)
                const key = command.input.Key.chatId || command.input.Key.userId || command.input.Key.id || Object.values(command.input.Key)[0]
                return { Item: table[key] || null }
            }

            if (type === 'QueryCommand') {
                const table = getTable(db, tableName)
                if (tableName === 'studymate_submissions') {
                    const userId = command.input.ExpressionAttributeValues[':uid']
                    const problemId = command.input.ExpressionAttributeValues[':pid']
                    
                    let items = table.filter(s => s.userId === userId)
                    if (problemId) {
                        items = items.filter(s => s.problemId === problemId)
                    }
                    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    return { Items: items }
                } else if (tableName === 'studymate_chats') {
                    const userId = command.input.ExpressionAttributeValues[':uid']
                    let items = Object.values(table).filter(c => c.userId === userId)
                    return { Items: items }
                } else if (tableName === 'studymate_chat_messages') {
                    const chatId = command.input.ExpressionAttributeValues[':cid']
                    let items = table.filter(m => m.chatId === chatId)
                    return { Items: items }
                }
                return { Items: Array.isArray(table) ? table : Object.values(table) }
            }

            if (type === 'UpdateCommand') {
                const table = getTable(db, tableName)
                if (tableName === 'studymate_gamification') {
                    const userId = command.input.Key.userId
                    let user = table[userId]
                    if (!user) user = { userId }
                    
                    // Rudimentary UpdateExpression parser for the specific cases in gamificationService
                    const expr = command.input.UpdateExpression
                    const vals = command.input.ExpressionAttributeValues
                    
                    if (expr.includes('SET xp = :xp')) {
                        user.xp = vals[':xp']
                        user.level = vals[':level']
                        user.xpHistory = vals[':history']
                    } else if (expr.includes('currentStreak = :cs')) {
                        user.currentStreak = vals[':cs']
                        user.maxStreak = vals[':ms']
                        user.lastActiveDate = vals[':lad']
                    } else if (expr.includes('languageUsage = :lu')) {
                        user.languageUsage = vals[':lu']
                    } else if (expr.includes('heatmap = :hm')) {
                        user.heatmap = vals[':hm']
                    } else if (expr.includes('badges = :badges')) {
                        user.badges = vals[':badges']
                    } else if (expr.includes('if_not_exists(totalSolved')) {
                        user.totalSolved = (user.totalSolved || 0) + 1
                        const diffKey = Object.keys(vals).find(k => k !== ':zero' && k !== ':one' && k !== ':now')
                        // We assume the difficulty key is added by codingController
                        if (expr.includes('easySolved')) user.easySolved = (user.easySolved || 0) + 1
                        if (expr.includes('mediumSolved')) user.mediumSolved = (user.mediumSolved || 0) + 1
                        if (expr.includes('hardSolved')) user.hardSolved = (user.hardSolved || 0) + 1
                    } else if (expr.includes('fastSolve = :fs')) {
                        user.fastSolve = vals[':fs']
                    } else if (expr.includes('debugUses')) {
                        user.debugUses = (user.debugUses || 0) + 1
                    }
                    
                    user.updatedAt = vals[':now'] || new Date().toISOString()
                    table[userId] = user
                    writeDb(db)
                    return {}
                } else if (tableName === 'studymate_chats') {
                    const chatId = command.input.Key.chatId
                    let chat = table[chatId]
                    if (!chat) return {}
                    const vals = command.input.ExpressionAttributeValues
                    if (vals[':title']) chat.title = vals[':title']
                    if (vals[':now']) chat.updatedAt = vals[':now']
                    if (vals[':count']) chat.messageCount = vals[':count']
                    
                    table[chatId] = chat
                    writeDb(db)
                    return {}
                }
            }

            return { Items: [] }
        }
        throw err
    }
}

export default dynamoDb
