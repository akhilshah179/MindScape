import { PutCommand, QueryCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import { HttpError, requireString } from '../middleware/http.js'

const TABLE = 'studymate_ai_memory'
const MAX_ITEMS = 100

export const normalizeMemoryKey = (key) =>
  String(key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)

export async function listMemory(userId) {
  const { Items = [] } = await dynamoDb.send(new QueryCommand({
    TableName: TABLE, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': userId }
  }))
  return Items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

/** Manual entries win: an auto-extracted fact never overwrites something the user typed. */
export async function upsertMemory(userId, key, value, source = 'manual') {
  const memoryKey = normalizeMemoryKey(key)
  if (!memoryKey) throw new HttpError(400, 'Memory key is invalid.')
  const item = { userId, memoryKey, value: String(value).trim().slice(0, 500), source, updatedAt: new Date().toISOString() }
  try {
    await dynamoDb.send(new PutCommand({
      TableName: TABLE, Item: item,
      ...(source === 'auto' ? { ConditionExpression: 'attribute_not_exists(memoryKey) OR #s = :auto', ExpressionAttributeNames: { '#s': 'source' }, ExpressionAttributeValues: { ':auto': 'auto' } } : {})
    }))
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') return null
    throw err
  }
  return item
}

// GET /memory
export const getMemory = async (req, res) => res.json(await listMemory(req.user.userId))

// POST /memory  { key, value }
export const setMemory = async (req, res) => {
  const existing = await listMemory(req.user.userId)
  const key = requireString(req.body?.key, 'key', { max: 60 })
  if (existing.length >= MAX_ITEMS && !existing.some(m => m.memoryKey === normalizeMemoryKey(key))) {
    throw new HttpError(400, `Memory is limited to ${MAX_ITEMS} items. Delete some first.`)
  }
  const item = await upsertMemory(req.user.userId, key, requireString(req.body?.value, 'value', { max: 500 }), 'manual')
  res.json({ success: true, item })
}

// DELETE /memory/:key
export const deleteMemory = async (req, res) => {
  const memoryKey = normalizeMemoryKey(req.params.key)
  await dynamoDb.send(new DeleteCommand({ TableName: TABLE, Key: { userId: req.user.userId, memoryKey } }))
  res.json({ success: true, deletedKey: memoryKey })
}

// DELETE /memory
export const clearAllMemory = async (req, res) => {
  const items = await listMemory(req.user.userId)
  for (let i = 0; i < items.length; i += 25) {
    await dynamoDb.send(new BatchWriteCommand({
      RequestItems: { [TABLE]: items.slice(i, i + 25).map(m => ({ DeleteRequest: { Key: { userId: m.userId, memoryKey: m.memoryKey } } })) }
    }))
  }
  res.json({ success: true, deleted: items.length })
}
