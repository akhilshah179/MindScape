import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import crypto from 'crypto'
import { callGroq } from '../services/aiService.js'

const TABLE_PREFIX = 'studymate'

/**
 * Helper to get user ID from request
 */
function getRequestUserId(req) {
    return req.headers['x-user-id'] || req.params?.userId || req.body?.userId || req.query?.userId || null
}

/**
 * Helper: Generate concise title fast without blocking network call
 */
function generateFastTitle(userMessage) {
    if (!userMessage) return 'New Chat'
    const clean = userMessage.trim().replace(/^[^a-zA-Z0-9]+/, '')
    const firstLine = clean.split('\n')[0].trim()
    const words = firstLine.split(/\s+/).slice(0, 6).join(' ')
    const truncated = words.slice(0, 45)
    return (truncated.charAt(0).toUpperCase() + truncated.slice(1)) + (firstLine.length > 45 ? '...' : '')
}

/**
 * Helper: Background AI title generation (refines title asynchronously)
 */
async function refineTitleInBackground(userId, chatId, userMessage) {
    try {
        const title = await callGroq({
            messages: [
                { role: 'system', content: 'Generate a short, descriptive title (3-5 words, no quotes) for this chat based on the user\'s first message. Respond ONLY with the title.' },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3,
            max_tokens: 25
        })
        const cleaned = title.trim().replace(/^["']|["']$/g, '').slice(0, 50)
        if (cleaned) {
            await dynamoDb.send(new UpdateCommand({
                TableName: `${TABLE_PREFIX}_chats`,
                Key: { userId, chatId },
                UpdateExpression: 'SET #title = :title',
                ExpressionAttributeNames: { '#title': 'title' },
                ExpressionAttributeValues: { ':title': cleaned }
            })).catch(() => {})
        }
    } catch {
        // Non-blocking fallback
    }
}

/**
 * Helper: Build system prompt with user AI memory and PDF context
 */
function formatSystemPrompt(memoryItems = [], pdfContext = null) {
    let memoryContext = ''
    if (memoryItems && memoryItems.length > 0) {
        memoryContext = '\n\nUSER CONTEXT (remember these details about the user):\n' +
            memoryItems.map(m => `- ${m.memoryKey}: ${m.value}`).join('\n')
    }

    let prompt = `You are StudyMate AI, a highly intelligent, friendly, and personalized learning assistant. You help students learn, understand concepts, prepare for exams, and stay productive.

FORMATTING RULES:
- Use **bold** for key terms and important concepts
- Use bullet points and numbered lists for clarity
- Use code blocks with language tags for any code
- Keep responses structured with headings when appropriate
- Be concise, direct, and encouraging
- Use analogies and real-world examples when explaining complex concepts`

    if (memoryContext) {
        prompt += memoryContext
    }

    if (pdfContext && typeof pdfContext === 'string' && pdfContext.trim()) {
        prompt += `\n\nDOCUMENT CONTEXT (the user has attached a document, prioritize answering based on this text):\n${pdfContext.slice(0, 10000)}`
    }

    return prompt
}

/**
 * Helper: Extract memory from conversation asynchronously
 */
async function extractAndSaveMemory(userId, messages) {
    try {
        const recentMessages = messages.slice(-6)
        const conversation = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')

        const extraction = await callGroq({
            messages: [
                {
                    role: 'system',
                    content: `Analyze this conversation and extract important facts about the user for future memory. Look for learning goals, weak topics, or academic level.
Respond ONLY with a JSON array: [{"key": "snake_case_key", "value": "the value"}]
If nothing worth remembering, respond with []`
                },
                { role: 'user', content: conversation }
            ],
            temperature: 0.2,
            max_tokens: 300
        })

        const cleaned = extraction.replace(/```json/g, '').replace(/```/g, '').trim()
        const items = JSON.parse(cleaned)

        if (Array.isArray(items) && items.length > 0) {
            for (const item of items.slice(0, 5)) {
                if (item.key && item.value) {
                    await dynamoDb.send(new PutCommand({
                        TableName: `${TABLE_PREFIX}_ai_memory`,
                        Item: {
                            userId,
                            memoryKey: item.key,
                            value: item.value,
                            source: 'auto',
                            updatedAt: new Date().toISOString()
                        }
                    })).catch(() => {})
                }
            }
        }
    } catch {
        // Non-critical background task
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/chat/:userId/new
 * Create a new chat session (persists immediately)
 */
export const createChat = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }

        const chatId = crypto.randomUUID()
        const now = new Date().toISOString()
        const { title, fileId, fileName } = req.body || {}

        const chatItem = {
            userId,
            chatId,
            title: title || 'New Chat',
            fileId: fileId || null,
            fileName: fileName || null,
            createdAt: now,
            updatedAt: now,
            messageCount: 0,
            isPinned: false,
            tags: []
        }

        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Item: chatItem
        }))

        res.json(chatItem)
    } catch (err) {
        console.error('Create chat error:', err)
        res.status(500).json({ error: 'Failed to create chat: ' + err.message })
    }
}

/**
 * GET /api/chat/:userId/list
 * Get all chats for a user, sorted by updatedAt desc
 */
export const getUserChats = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }

        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }))

        const chats = (data.Items || []).sort((a, b) =>
            new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
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
        const userId = getRequestUserId(req)

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }

        // Security ownership check
        const chatData = await dynamoDb.send(new GetCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId }
        })).catch(() => ({ Item: null }))

        if (chatData.Item && chatData.Item.userId && chatData.Item.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this chat.' })
        }

        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            KeyConditionExpression: 'chatId = :cid',
            ExpressionAttributeValues: { ':cid': chatId }
        }))

        const messages = (data.Items || []).sort((a, b) =>
            new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
        )

        res.json(messages)
    } catch (err) {
        console.error('Get messages error:', err)
        res.status(500).json({ error: 'Failed to fetch messages' })
    }
}

/**
 * POST /api/chat/:chatId/send
 * High-performance message sender with parallel pre-processing and instant return
 */
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params
        const userId = getRequestUserId(req)
        const { content, pdfContext, fileId, fileName } = req.body || {}

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content cannot be empty.' })
        }

        const now = new Date().toISOString()
        const userMessageId = `msg_${Date.now()}_user`

        // 1. Parallel Pre-execution: Save user message, fetch chat, previous messages & memory in parallel
        const [chatRes, prevMsgsRes, memRes] = await Promise.all([
            dynamoDb.send(new GetCommand({
                TableName: `${TABLE_PREFIX}_chats`,
                Key: { userId, chatId }
            })).catch(() => ({ Item: null })),

            dynamoDb.send(new QueryCommand({
                TableName: `${TABLE_PREFIX}_chat_messages`,
                KeyConditionExpression: 'chatId = :cid',
                ExpressionAttributeValues: { ':cid': chatId }
            })).catch(() => ({ Items: [] })),

            dynamoDb.send(new QueryCommand({
                TableName: `${TABLE_PREFIX}_ai_memory`,
                KeyConditionExpression: 'userId = :uid',
                ExpressionAttributeValues: { ':uid': userId }
            })).catch(() => ({ Items: [] })),

            dynamoDb.send(new PutCommand({
                TableName: `${TABLE_PREFIX}_chat_messages`,
                Item: {
                    chatId,
                    messageId: userMessageId,
                    userId,
                    role: 'user',
                    content: content.trim(),
                    timestamp: now,
                    metadata: {}
                }
            }))
        ])

        const existingChat = chatRes.Item
        if (existingChat && existingChat.userId && existingChat.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this chat.' })
        }

        const allPrevious = (prevMsgsRes.Items || []).sort((a, b) =>
            new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
        )

        // 2. Build system prompt & context window
        const systemPrompt = formatSystemPrompt(memRes.Items || [], pdfContext)
        const contextMessages = allPrevious.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }))

        // 3. Call AI single-shot
        const aiReply = await callGroq({
            messages: [
                { role: 'system', content: systemPrompt },
                ...contextMessages,
                { role: 'user', content: content.trim() }
            ],
            temperature: 0.65,
            max_tokens: 1536
        })

        const replyTimestamp = new Date().toISOString()
        const aiMessageId = `msg_${Date.now()}_assistant`

        // Determine title
        const isFirstMessage = !existingChat || existingChat.title === 'New Chat' || allPrevious.length <= 1
        const fastTitle = isFirstMessage ? generateFastTitle(content) : (existingChat?.title || 'New Chat')

        const chatRecord = {
            userId,
            chatId,
            title: existingChat && existingChat.title !== 'New Chat' ? existingChat.title : fastTitle,
            fileId: fileId || existingChat?.fileId || null,
            fileName: fileName || existingChat?.fileName || null,
            createdAt: existingChat?.createdAt || now,
            updatedAt: replyTimestamp,
            messageCount: (existingChat?.messageCount || allPrevious.length) + 2,
            isPinned: existingChat?.isPinned || false,
            tags: existingChat?.tags || []
        }

        // 4. Parallel Post-execution: Save AI message & update chat session in DB
        await Promise.all([
            dynamoDb.send(new PutCommand({
                TableName: `${TABLE_PREFIX}_chat_messages`,
                Item: {
                    chatId,
                    messageId: aiMessageId,
                    userId,
                    role: 'assistant',
                    content: aiReply,
                    timestamp: replyTimestamp,
                    metadata: {}
                }
            })),
            dynamoDb.send(new PutCommand({
                TableName: `${TABLE_PREFIX}_chats`,
                Item: chatRecord
            }))
        ])

        // 5. Return response immediately (0 extra LLM calls)
        res.json({
            reply: aiReply,
            messageId: aiMessageId,
            title: chatRecord.title,
            timestamp: replyTimestamp
        })
    } catch (err) {
        console.error('Send message error:', err)
        res.status(500).json({ error: 'Failed to send message: ' + err.message })
    }
}

/**
 * PUT /api/chat/:userId/:chatId/rename
 * Rename a chat
 */
export const renameChat = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { chatId } = req.params
        const { title } = req.body || {}

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title cannot be empty.' })
        }

        // Security check
        const chatData = await dynamoDb.send(new GetCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId }
        }))
        if (chatData.Item && chatData.Item.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this chat.' })
        }

        await dynamoDb.send(new UpdateCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId },
            UpdateExpression: 'SET #title = :title, #updatedAt = :now',
            ExpressionAttributeNames: { '#title': 'title', '#updatedAt': 'updatedAt' },
            ExpressionAttributeValues: { ':title': title.trim(), ':now': new Date().toISOString() }
        }))

        res.json({ success: true, title: title.trim() })
    } catch (err) {
        console.error('Rename chat error:', err)
        res.status(500).json({ error: 'Failed to rename chat: ' + err.message })
    }
}

/**
 * DELETE /api/chat/:userId/:chatId
 * Delete a chat and all its messages
 */
export const deleteChat = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { chatId } = req.params

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }

        // Security check
        const chatData = await dynamoDb.send(new GetCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId }
        }))
        if (chatData.Item && chatData.Item.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this chat.' })
        }

        // 1. Delete chat metadata
        await dynamoDb.send(new DeleteCommand({
            TableName: `${TABLE_PREFIX}_chats`,
            Key: { userId, chatId }
        }))

        // 2. Query and delete all messages for this chat
        const msgData = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_chat_messages`,
            KeyConditionExpression: 'chatId = :cid',
            ExpressionAttributeValues: { ':cid': chatId }
        }))

        const items = msgData.Items || []
        if (items.length > 0) {
            const chunks = []
            for (let i = 0; i < items.length; i += 25) {
                chunks.push(items.slice(i, i + 25))
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
        res.status(500).json({ error: 'Failed to delete chat: ' + err.message })
    }
}

/**
 * GET /api/chat/:userId/search?q=query
 * Search chats by title
 */
export const searchChats = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const query = (req.query.q || '').toLowerCase().trim()

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
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
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

        res.json(filtered)
    } catch (err) {
        console.error('Search chats error:', err)
        res.status(500).json({ error: 'Failed to search chats' })
    }
}
