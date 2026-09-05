import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: '../.env' })
dotenv.config()

// AWS picks up AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY from env automatically
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
})

const dynamoDb = DynamoDBDocumentClient.from(client)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_DB_PATH = path.join(__dirname, '..', 'local-db.json')

// Initialize local DB if it doesn't exist
if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({
        studymate_gamification: {},
        studymate_submissions: [],
        studymate_chats: {},
        studymate_chat_messages: [],
        studymate_ai_memory: [],
        studymate_files: [],
        studymate_summaries: []
    }, null, 2))
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
        if (tableName.includes('gamification') || tableName.endsWith('_chats')) {
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
        if (err.name === 'CredentialsProviderError' || err.message.includes('credentials') || err.name === 'ResourceNotFoundException') {
            const db = readDb()
            const tableName = command.input?.TableName
            const type = command.constructor.name

            // ── BatchWriteCommand ───────────────────────────────────────────────────
            if (type === 'BatchWriteCommand') {
                const requestItems = command.input?.RequestItems || {}
                for (const [tName, requests] of Object.entries(requestItems)) {
                    const table = getTable(db, tName)
                    for (const req of requests) {
                        if (req.DeleteRequest?.Key) {
                            const keyObj = req.DeleteRequest.Key
                            const cid = keyObj.chatId
                            const mid = keyObj.messageId
                            const fid = keyObj.fileId
                            const id = keyObj.id

                            if (Array.isArray(table)) {
                                const idx = table.findIndex(i =>
                                    (cid && mid && i.chatId === cid && i.messageId === mid) ||
                                    (cid && !mid && i.chatId === cid) ||
                                    (fid && i.fileId === fid) ||
                                    (id && i.id === id)
                                )
                                if (idx >= 0) table.splice(idx, 1)
                            } else {
                                const k = cid || fid || id
                                if (k) delete table[k]
                            }
                        }
                    }
                }
                writeDb(db)
                return { UnprocessedItems: {} }
            }

            // ── PutCommand ──────────────────────────────────────────────────────────
            if (type === 'PutCommand') {
                const table = getTable(db, tableName)
                const item = command.input?.Item || {}

                if (Array.isArray(table)) {
                    // Find if item already exists to update in place
                    let idx = -1
                    if (tableName === 'studymate_chat_messages') {
                        idx = table.findIndex(i => i.chatId === item.chatId && i.messageId === item.messageId)
                    } else if (tableName === 'studymate_ai_memory') {
                        idx = table.findIndex(i => i.userId === item.userId && i.memoryKey === item.memoryKey)
                    } else if (tableName === 'studymate_files') {
                        idx = table.findIndex(i => i.fileId === item.fileId)
                    } else if (tableName === 'studymate_summaries') {
                        idx = table.findIndex(i => i.summaryId === item.summaryId || (item.fileId && i.fileId === item.fileId))
                    } else if (tableName === 'studymate_quizzes') {
                        idx = table.findIndex(i => i.quizId === item.quizId || (item.fileId && i.fileId === item.fileId))
                    } else if (tableName === 'studymate_scores') {
                        idx = table.findIndex(i => (item.id && i.id === item.id) || (item.scoreId && i.scoreId === item.scoreId))
                    } else if (tableName === 'studymate_submissions') {
                        idx = table.findIndex(i => i.submissionId === item.submissionId)
                    } else {
                        const pk = item.id || item.fileId || item.chatId || item.quizId
                        if (pk) idx = table.findIndex(i => (i.id === pk || i.fileId === pk || i.chatId === pk || i.quizId === pk))
                    }

                    if (idx >= 0) table[idx] = item
                    else table.push(item)
                } else {
                    const key = item.chatId || item.userId || item.fileId || item.quizId || item.id || 'default'
                    table[key] = item
                }

                writeDb(db)
                return {}
            }
            
            // ── GetCommand ──────────────────────────────────────────────────────────
            if (type === 'GetCommand') {
                const table = getTable(db, tableName)
                const keyObj = command.input?.Key || {}
                const targetKey = keyObj.chatId || keyObj.fileId || keyObj.quizId || keyObj.summaryId || keyObj.userId || keyObj.id || Object.values(keyObj)[0]

                if (Array.isArray(table)) {
                    const found = table.find(i =>
                        (keyObj.chatId && keyObj.userId && i.chatId === keyObj.chatId && i.userId === keyObj.userId) ||
                        (keyObj.chatId && i.chatId === keyObj.chatId) ||
                        (keyObj.fileId && i.fileId === keyObj.fileId) ||
                        (keyObj.quizId && i.quizId === keyObj.quizId) ||
                        (keyObj.summaryId && i.summaryId === keyObj.summaryId) ||
                        (keyObj.userId && i.userId === keyObj.userId) ||
                        (keyObj.id && i.id === keyObj.id) ||
                        (targetKey && (i.id === targetKey || i.fileId === targetKey || i.chatId === targetKey || i.quizId === targetKey))
                    )
                    return { Item: found || null }
                }

                return { Item: table[targetKey] || null }
            }

            // ── DeleteCommand ───────────────────────────────────────────────────────
            if (type === 'DeleteCommand') {
                const table = getTable(db, tableName)
                const keyObj = command.input?.Key || {}
                const targetKey = keyObj.chatId || keyObj.fileId || keyObj.quizId || keyObj.summaryId || keyObj.userId || keyObj.id || Object.values(keyObj)[0]

                if (Array.isArray(table)) {
                    const idx = table.findIndex(i =>
                        (keyObj.chatId && keyObj.userId && i.chatId === keyObj.chatId && i.userId === keyObj.userId) ||
                        (keyObj.chatId && i.chatId === keyObj.chatId) ||
                        (keyObj.fileId && i.fileId === keyObj.fileId) ||
                        (keyObj.quizId && i.quizId === keyObj.quizId) ||
                        (keyObj.summaryId && i.summaryId === keyObj.summaryId) ||
                        (keyObj.userId && keyObj.memoryKey && i.userId === keyObj.userId && i.memoryKey === keyObj.memoryKey) ||
                        (keyObj.id && i.id === keyObj.id) ||
                        (targetKey && (i.id === targetKey || i.fileId === targetKey || i.chatId === targetKey || i.quizId === targetKey))
                    )
                    if (idx >= 0) table.splice(idx, 1)
                } else {
                    if (targetKey) delete table[targetKey]
                }
                writeDb(db)
                return {}
            }

            // ── QueryCommand & ScanCommand ──────────────────────────────────────────
            if (type === 'QueryCommand' || type === 'ScanCommand') {
                const table = getTable(db, tableName)
                const values = command.input?.ExpressionAttributeValues || {}

                if (tableName === 'studymate_submissions') {
                    const userId = values[':uid']
                    const problemId = values[':pid']
                    let items = table.filter(s => !userId || s.userId === userId)
                    if (problemId) items = items.filter(s => s.problemId === problemId)
                    items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                    return { Items: items }
                } else if (tableName === 'studymate_chats') {
                    const userId = values[':uid']
                    let items = Array.isArray(table) ? table : Object.values(table)
                    if (userId) items = items.filter(c => c.userId === userId)
                    items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
                    return { Items: items }
                } else if (tableName === 'studymate_chat_messages') {
                    const chatId = values[':cid']
                    let items = table.filter(m => !chatId || m.chatId === chatId)
                    items.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
                    return { Items: items }
                } else if (tableName === 'studymate_ai_memory') {
                    const userId = values[':uid']
                    let items = Array.isArray(table) ? table : Object.values(table)
                    if (userId) items = items.filter(m => m.userId === userId)
                    return { Items: items }
                } else if (tableName === 'studymate_files') {
                    const userId = values[':uid']
                    const subject = values[':subj']
                    let items = Array.isArray(table) ? table : Object.values(table)
                    if (userId) items = items.filter(f => f.userId === userId)
                    if (subject) items = items.filter(f => f.subjectName === subject)
                    items.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
                    return { Items: items }
                } else if (tableName === 'studymate_summaries') {
                    const fileId = values[':fid']
                    const userId = values[':uid']
                    let items = Array.isArray(table) ? table : Object.values(table)
                    if (fileId) items = items.filter(s => s.fileId === fileId)
                    if (userId) items = items.filter(s => s.userId === userId)
                    return { Items: items }
                } else if (tableName === 'studymate_quizzes') {
                    const fileId = values[':fid']
                    const userId = values[':uid']
                    let items = Array.isArray(table) ? table : Object.values(table)
                    if (fileId) items = items.filter(q => q.fileId === fileId)
                    if (userId) items = items.filter(q => q.userId === userId)
                    return { Items: items }
                } else if (tableName === 'studymate_scores' || tableName === 'studymate_quiz_scores') {
                    const userId = values[':uid']
                    let items = Array.isArray(table) ? table : Object.values(table)
                    if (userId) items = items.filter(s => s.userId === userId)
                    items.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0))
                    return { Items: items }
                }
                return { Items: Array.isArray(table) ? table : Object.values(table) }
            }

            // ── UpdateCommand ───────────────────────────────────────────────────────
            if (type === 'UpdateCommand') {
                const table = getTable(db, tableName)
                const keyObj = command.input?.Key || {}
                const expr = command.input?.UpdateExpression || ''
                const vals = command.input?.ExpressionAttributeValues || {}

                if (tableName === 'studymate_gamification') {
                    const userId = keyObj.userId
                    let user = table[userId] || { userId }
                    
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
                    const chatId = keyObj.chatId
                    let chat = null
                    if (Array.isArray(table)) {
                        chat = table.find(c => c.chatId === chatId)
                    } else {
                        chat = table[chatId]
                    }

                    if (chat) {
                        if (vals[':title']) chat.title = vals[':title']
                        if (vals[':now']) chat.updatedAt = vals[':now']
                        if (vals[':count'] !== undefined) chat.messageCount = vals[':count']
                        if (vals[':fileId']) chat.fileId = vals[':fileId']
                        if (vals[':fileName']) chat.fileName = vals[':fileName']
                    }
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
