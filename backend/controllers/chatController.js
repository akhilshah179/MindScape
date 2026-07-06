import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import crypto from 'crypto'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const TABLE_PREFIX = 'studymate'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ─── Helper: Call Groq AI ─────────────────────────────────────────────────────
async function callGroq(messages, { temperature = 0.7, max_tokens = 2048 } = {}) {
    if (!process.env.GROQ_API_KEY) {
        return "I'm running in local offline mode because no `GROQ_API_KEY` was found in the backend `.env` file! Please add a free Groq API key to activate AI features."
    }

    const response = await axios.post(GROQ_URL, {
        model: GROQ_MODEL,
        temperature,
        max_tokens,
        messages
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    return response.data?.choices?.[0]?.message?.content || ''
}

// ─── Helper: Auto-generate chat title from first message ──────────────────────
async function generateTitle(userMessage) {
    try {
        const title = await callGroq([
            { role: 'system', content: 'Generate a very short title (3-6 words, no quotes) for this chat based on the user\'s first message. Respond with ONLY the title, nothing else.' },
            { role: 'user', content: userMessage }
        ], { temperature: 0.3, max_tokens: 30 })
        return title.trim().replace(/^["']|["']$/g, '').slice(0, 60)
    } catch {
        return userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
    }
}

// ─── Helper: Build system prompt with AI memory ───────────────────────────────
async function buildSystemPrompt(userId, pdfContext = null) {
    // Load user's AI memory
    let memoryContext = ''
    try {
        const memData = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }))
        if (memData.Items?.length) {
            memoryContext = '\n\nUSER CONTEXT (remember these details about the user):\n' +
                memData.Items.map(m => `- ${m.memoryKey}: ${m.value}`).join('\n')
        }
    } catch { /* ignore memory load errors */ }

    let prompt = `You are StudyMate AI, a highly intelligent, friendly, and personalized learning assistant. You help students learn, understand concepts, prepare for exams, and stay productive.

FORMATTING RULES:
- Use **bold** for key terms and important concepts
- Use bullet points and numbered lists for clarity
- Use code blocks with language tags for any code
- Keep responses structured with headings when appropriate
- Be concise but thorough
- Use analogies and real-world examples when explaining concepts`

    if (memoryContext) {
        prompt += memoryContext
    }

    if (pdfContext) {
        prompt += `\n\nDOCUMENT CONTEXT (the user has uploaded a document, answer questions based on this):\n${pdfContext.slice(0, 12000)}`
    }

    return prompt
}

// ─── Helper: Extract memory from conversation ─────────────────────────────────
async function extractAndSaveMemory(userId, messages) {
    try {
        const recentMessages = messages.slice(-6)
        const conversation = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')

        const extraction = await callGroq([
            {
                role: 'system',
                content: `Analyze this conversation and extract any important facts about the user that should be remembered for future conversations. Look for:
- Learning goals or targets (e.g., "preparing for GATE", "learning React")
- Preferred learning style (e.g., "visual learner", "prefers examples")
- Weak topics or areas needing improvement
- Academic level or background
- Important deadlines or schedules

Respond ONLY with a JSON array of objects: [{"key": "snake_case_key", "value": "the value"}]
If nothing worth remembering, respond with an empty array: []
Do NOT include trivial or obvious facts.`
            },
            { role: 'user', content: conversation }
        ], { temperature: 0.2, max_tokens: 500 })

        const cleaned = extraction.replace(/```json/g, '').replace(/```/g, '').trim()
        const items = JSON.parse(cleaned)

        if (Array.isArray(items) && items.length > 0) {
            for (const item of items.slice(0, 5)) {
                await dynamoDb.send(new PutCommand({
                    TableName: `${TABLE_PREFIX}_ai_memory`,
                    Item: {
                        userId,
                        memoryKey: item.key,
                        value: item.value,
                        source: 'auto',
                        updatedAt: new Date().toISOString()
                    }
                }))
            }
        }
    } catch (err) {
        console.error('Memory extraction failed (non-critical):', err.message)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/chat/:userId/new
 * Create a new chat session
 */
export const createChat = async (req, res) => {
    try {
        const { userId } = req.params
        const chatId = crypto.randomUUID()
        const now = new Date().toISOString()

        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Item: {
                userId,
                chatId,
                title: 'New Chat',
                createdAt: now,
                updatedAt: now,
                messageCount: 0,
                isPinned: false,
                tags: []
            }
        }))

        res.json({ chatId, title: 'New Chat', createdAt: now })
    } catch (err) {
        console.error('Create chat error:', err)
        res.status(500).json({ error: 'Failed to create chat' })
    }
}

/**
 * GET /api/chat/:userId/list
 * Get all chats for a user, sorted by updatedAt desc
 */
export const getUserChats = async (req, res) => {
    try {
        const { userId } = req.params
        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId },
            ScanIndexForward: false // newest first
        }))

        // Sort by updatedAt descending (DynamoDB sorts by sort key, but we want by updatedAt)
        const chats = (data.Items || []).sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )

        res.json(chats)
    } catch (err) {
        console.error('Get chats error:', err)
        res.status(500).json({ error: 'Failed to fetch chats' })
    }
}

/**
 * GET /api/chat/:chatId/messages
 * Get all messages for a chat
 */
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params
        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            KeyConditionExpression: 'chatId = :cid',
            ExpressionAttributeValues: { ':cid': chatId },
            ScanIndexForward: true // oldest first
        }))

        res.json(data.Items || [])
    } catch (err) {
        console.error('Get messages error:', err)
        res.status(500).json({ error: 'Failed to fetch messages' })
    }
}

/**
 * POST /api/chat/:chatId/send
 * Send a message and get AI response
 * Body: { userId, content, pdfContext? }
 */
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params
        const { userId, content, pdfContext } = req.body
        const now = new Date().toISOString()

        // 1. Save user message
        const userMessageId = `msg_${Date.now()}_user`
        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            Item: {
                chatId,
                messageId: userMessageId,
                role: 'user',
                content,
                timestamp: now,
                metadata: {}
            }
        }))

        // 2. Load previous messages for context
        const prevData = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            KeyConditionExpression: 'chatId = :cid',
            ExpressionAttributeValues: { ':cid': chatId },
            ScanIndexForward: true
        }))

        const allMessages = prevData.Items || []

        // 3. Build system prompt with memory
        const systemPrompt = await buildSystemPrompt(userId, pdfContext)

        // 4. Build conversation context (last 10 messages for context window)
        const contextMessages = allMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }))

        // 5. Call Groq AI
        const aiReply = await callGroq([
            { role: 'system', content: systemPrompt },
            ...contextMessages
        ])

        // 6. Save AI response
        const aiMessageId = `msg_${Date.now()}_assistant`
        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            Item: {
                chatId,
                messageId: aiMessageId,
                role: 'assistant',
                content: aiReply,
                timestamp: new Date().toISOString(),
                metadata: { model: GROQ_MODEL }
            }
        }))

        // 7. Update chat metadata (title on first message, always update timestamp)
        const chatData = await dynamoDb.send(new GetCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId }
        }))

        const updateExpr = ['#updatedAt = :now', '#msgCount = :count']
        const exprNames = { '#updatedAt': 'updatedAt', '#msgCount': 'messageCount' }
        const exprValues = {
            ':now': new Date().toISOString(),
            ':count': (chatData.Item?.messageCount || 0) + 2
        }

        // Auto-generate title on first message
        if (chatData.Item?.title === 'New Chat' && allMessages.length <= 1) {
            const title = await generateTitle(content)
            updateExpr.push('#title = :title')
            exprNames['#title'] = 'title'
            exprValues[':title'] = title
        }

        await dynamoDb.send(new UpdateCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId },
            UpdateExpression: 'SET ' + updateExpr.join(', '),
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues
        }))

        // 8. Extract memory (async, non-blocking)
        extractAndSaveMemory(userId, [...allMessages, { role: 'assistant', content: aiReply }])

        // 9. Return response
        res.json({
            reply: aiReply,
            messageId: aiMessageId,
            title: exprValues[':title'] || chatData.Item?.title
        })
    } catch (err) {
        console.error('Send message error:', err)
        res.status(500).json({ error: 'Failed to send message' })
    }
}

/**
 * PUT /api/chat/:userId/:chatId/rename
 * Rename a chat
 */
export const renameChat = async (req, res) => {
    try {
        const { userId, chatId } = req.params
        const { title } = req.body

        await dynamoDb.send(new UpdateCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId },
            UpdateExpression: 'SET #title = :title, #updatedAt = :now',
            ExpressionAttributeNames: { '#title': 'title', '#updatedAt': 'updatedAt' },
            ExpressionAttributeValues: { ':title': title, ':now': new Date().toISOString() }
        }))

        res.json({ success: true })
    } catch (err) {
        console.error('Rename chat error:', err)
        res.status(500).json({ error: 'Failed to rename chat' })
    }
}

/**
 * DELETE /api/chat/:userId/:chatId
 * Delete a chat and all its messages
 */
export const deleteChat = async (req, res) => {
    try {
        const { userId, chatId } = req.params

        // 1. Delete chat metadata
        await dynamoDb.send(new DeleteCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId }
        }))

        // 2. Delete all messages for this chat
        const msgData = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            KeyConditionExpression: 'chatId = :cid',
            ExpressionAttributeValues: { ':cid': chatId },
            ProjectionExpression: 'chatId, messageId'
        }))

        if (msgData.Items?.length) {
            // Batch delete in chunks of 25
            const chunks = []
            for (let i = 0; i < msgData.Items.length; i += 25) {
                chunks.push(msgData.Items.slice(i, i + 25))
            }
            for (const chunk of chunks) {
                await dynamoDb.send(new BatchWriteCommand({
                    RequestItems: {
                        [`${TABLE_PREFIX}_chat_messages`]: chunk.map(item => ({
                            DeleteRequest: { Key: { chatId: item.chatId, messageId: item.messageId } }
                        }))
                    }
                }))
            }
        }

        res.json({ success: true })
    } catch (err) {
        console.error('Delete chat error:', err)
        res.status(500).json({ error: 'Failed to delete chat' })
    }
}

/**
 * GET /api/chat/:userId/search?q=query
 * Search chats by title
 */
export const searchChats = async (req, res) => {
    try {
        const { userId } = req.params
        const query = (req.query.q || '').toLowerCase().trim()

        if (!query) {
            return res.json([])
        }

        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }))

        const filtered = (data.Items || [])
            .filter(chat => chat.title?.toLowerCase().includes(query))
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

        res.json(filtered)
    } catch (err) {
        console.error('Search chats error:', err)
        res.status(500).json({ error: 'Failed to search chats' })
    }
}
