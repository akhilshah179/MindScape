import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import crypto from 'crypto'

export const TABLE_PREFIX = 'studymate'

export const getProfile = async (req, res) => {
    try {
        const { userId } = req.params
        const data = await dynamoDb.send(new GetCommand({
            TableName: `${TABLE_PREFIX}_users`,
            Key: { userId }
        }))
        res.json(data.Item || { userId, message: "Profile not found" })
    } catch (err) {
        console.error('DynamoDB Error:', err)
        res.status(500).json({ error: "Failed to fetch profile" })
    }
}

export const syncAppState = async (req, res) => {
    // This replicates the functionality generated in useCloudSync using S3
    // but migrates it professionally into our DynamoDB structured NoSQL
    try {
        const { userId } = req.params
        const { state } = req.body

        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_users`,
            Item: {
                userId,
                appState: state,
                updatedAt: new Date().toISOString()
            }
        }))
        res.json({ success: true, message: "State synced successfully." })
    } catch (err) {
        console.error('DynamoDB Error:', err)
        res.status(500).json({ error: "Failed to sync state" })
    }
}

// Save Quiz Score
export const saveQuizScore = async (req, res) => {
    try {
        const { userId } = req.params
        const payload = req.body

        const quizId = crypto.randomUUID()
        await dynamoDb.send(new PutCommand({
            TableName: `${TABLE_PREFIX}_scores`,
            Item: {
                userId,
                quizId,
                timestamp: new Date().toISOString(),
                ...payload
            }
        }))
        res.json({ success: true, quizId })
    } catch (err) {
        console.error('DynamoDB Error:', err)
        res.status(500).json({ error: "Failed to save quiz" })
    }
}

// Fetch all score histories
export const getQuizScores = async (req, res) => {
    try {
        const { userId } = req.params
        // Note: In real DynamoDB we'd use index on userId. Assuming userId is Partition Key
        const data = await dynamoDb.send(new QueryCommand({
            TableName: `${TABLE_PREFIX}_scores`,
            KeyConditionExpression: "userId = :uid",
            ExpressionAttributeValues: { ":uid": userId }
        }))
        res.json(data.Items || [])
    } catch (err) {
        console.error('DynamoDB Error:', err)
        res.status(500).json({ error: "Failed to fetch scores" })
    }
}
