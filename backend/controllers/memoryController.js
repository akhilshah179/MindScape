import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const TABLE_PREFIX = 'studymate'

/**
 * GET /api/memory/:userId
 * Retrieve all AI memory items for a user
 */
export const getMemory = async (req, res) => {
    try {
        const { userId } = req.params

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
        const { key, value } = req.body

        if (!key || !value) {
            return res.status(400).json({ error: 'Key and value are required' })
        }

        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            Item: {
                userId,
                memoryKey: key.trim().toLowerCase().replace(/\s+/g, '_'),
                value: value.trim(),
                source: 'manual',
                updatedAt: new Date().toISOString()
            }
        }))

        res.json({ success: true })
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

        await dynamoDb.send(new DeleteCommand({
            TableName: `${TABLE_PREFIX}_ai_memory`,
            Key: { userId, memoryKey: key }
        }))

        res.json({ success: true })
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
