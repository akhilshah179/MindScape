import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const TABLE_PREFIX = 'studymate'

function getRequestUserId(req) {
    return req.headers['x-user-id'] || req.params?.userId || req.body?.userId || req.query?.userId || null
}

function normalizeMemoryKey(key) {
    if (!key) return ''
    return String(key).trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * GET /api/memory/:userId
 * Retrieve all AI memory items for a user
 */
export const getMemory = async (req, res) => {
    try {
        const { userId } = req.params
        const authUserId = getRequestUserId(req)

        if (!authUserId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You cannot access another user\'s memory.' })
        }

        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }))

        res.json(data.Items || [])
    } catch (err) {
        console.error('Get memory error:', err)
        res.status(500).json({ error: 'Failed to fetch memory' })
    }
}

/**
 * POST /api/memory/:userId
 * Set or update a memory item
 * Body: { key, value }
 */
export const setMemory = async (req, res) => {
    try {
        const { userId } = req.params
        const authUserId = getRequestUserId(req)
        const { key, value } = req.body

        if (!authUserId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You cannot modify another user\'s memory.' })
        }

        if (!key || !value) {
            return res.status(400).json({ error: 'Key and value are required' })
        }

        const memoryKey = normalizeMemoryKey(key)
        const now = new Date().toISOString()
        const memoryItem = {
            userId,
            memoryKey,
            value: String(value).trim(),
            source: 'manual',
            updatedAt: now
        }

        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            Item: memoryItem
        }))

        res.json({ success: true, item: memoryItem })
    } catch (err) {
        console.error('Set memory error:', err)
        res.status(500).json({ error: 'Failed to save memory' })
    }
}

/**
 * DELETE /api/memory/:userId/:key
 * Delete a specific memory item
 */
export const deleteMemory = async (req, res) => {
    try {
        const { userId, key } = req.params
        const authUserId = getRequestUserId(req)

        if (!authUserId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You cannot delete another user\'s memory.' })
        }

        const normalizedKey = normalizeMemoryKey(key)

        await dynamoDb.send(new DeleteCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            Key: { userId, memoryKey: normalizedKey }
        }))

        // Also clean raw key if different
        if (normalizedKey !== key) {
            try {
                await dynamoDb.send(new DeleteCommand({
                    TableName: `${TABLE_PREFIX}_ai_memory`,
                    Key: { userId, memoryKey: key }
                }))
            } catch (_) {}
        }

        res.json({ success: true, deletedKey: normalizedKey })
    } catch (err) {
        console.error('Delete memory error:', err)
        res.status(500).json({ error: 'Failed to delete memory' })
    }
}

/**
 * DELETE /api/memory/:userId
 * Clear all memory for a user — use query param ?all=true
 */
export const clearAllMemory = async (req, res) => {
    try {
        const { userId } = req.params
        const authUserId = getRequestUserId(req)

        if (!authUserId) {
            return res.status(401).json({ error: 'Unauthorized: User identity required.' })
        }
        if (authUserId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You cannot clear another user\'s memory.' })
        }

        if (req.query.all !== 'true') {
            return res.status(400).json({ error: 'Pass ?all=true to confirm clearing all memory' })
        }

        // Fetch all memory items
        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId },
            ProjectionExpression: 'userId, memoryKey'
        }))

        if (data.Items?.length) {
            // Delete each item
            await Promise.all(data.Items.map(item =>
                dynamoDb.send(new DeleteCommand({
                    TableName: `${TABLE_PREFIX}_ai_memory`,
                    Key: { userId: item.userId, memoryKey: item.memoryKey }
                }))
            ))
        }

        res.json({ success: true, deleted: data.Items?.length || 0 })
    } catch (err) {
        console.error('Clear memory error:', err)
        res.status(500).json({ error: 'Failed to clear memory' })
    }
}

