import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { LocalStore, ConditionalCheckFailedException } from '../config/localStore.js'

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ms-db-')), 'db.json')

test('put/get/delete by composite key', () => {
  const s = new LocalStore(tmpFile())
  s.send(new PutCommand({ TableName: 'studymate_chats', Item: { userId: 'u1', chatId: 'c1', title: 'A' } }))
  s.send(new PutCommand({ TableName: 'studymate_chats', Item: { userId: 'u2', chatId: 'c1', title: 'B' } }))
  assert.equal(s.send(new GetCommand({ TableName: 'studymate_chats', Key: { userId: 'u1', chatId: 'c1' } })).Item.title, 'A')
  assert.equal(s.send(new GetCommand({ TableName: 'studymate_chats', Key: { userId: 'u2', chatId: 'c1' } })).Item.title, 'B')
  s.send(new DeleteCommand({ TableName: 'studymate_chats', Key: { userId: 'u1', chatId: 'c1' } }))
  assert.equal(s.send(new GetCommand({ TableName: 'studymate_chats', Key: { userId: 'u1', chatId: 'c1' } })).Item, undefined)
  assert.ok(s.send(new GetCommand({ TableName: 'studymate_chats', Key: { userId: 'u2', chatId: 'c1' } })).Item)
})

test('missing key attribute is rejected', () => {
  const s = new LocalStore(tmpFile())
  assert.throws(() => s.send(new GetCommand({ TableName: 'studymate_chats', Key: { chatId: 'c1' } })), /ValidationException/)
})

test('query isolates by partition key, sorts, filters, limits', () => {
  const s = new LocalStore(tmpFile())
  for (const [u, id] of [['u1', 'b'], ['u1', 'a'], ['u2', 'z'], ['u1', 'c']])
    s.send(new PutCommand({ TableName: 'studymate_submissions', Item: { userId: u, submissionId: id, verdict: id === 'c' ? 'Accepted' : 'Failed' } }))
  const q = (extra = {}) => s.send(new QueryCommand({ TableName: 'studymate_submissions', KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': 'u1', ...(extra.vals || {}) }, ...extra.params })).Items
  assert.deepEqual(q().map(i => i.submissionId), ['a', 'b', 'c'])
  assert.deepEqual(q({ params: { ScanIndexForward: false, Limit: 2 } }).map(i => i.submissionId), ['c', 'b'])
  assert.deepEqual(q({ params: { FilterExpression: 'verdict = :v' }, vals: { ':v': 'Accepted' } }).map(i => i.submissionId), ['c'])
})

test('update expressions: SET, if_not_exists arithmetic, list_append, ADD, REMOVE, #names', () => {
  const s = new LocalStore(tmpFile())
  const up = (UpdateExpression, vals, names) => s.send(new UpdateCommand({
    TableName: 'studymate_gamification', Key: { userId: 'u1' }, UpdateExpression,
    ExpressionAttributeValues: vals, ExpressionAttributeNames: names, ReturnValues: 'ALL_NEW'
  })).Attributes
  let a = up('SET xp = if_not_exists(xp, :z) + :n, #lvl = :l', { ':z': 0, ':n': 50, ':l': 1 }, { '#lvl': 'level' })
  assert.equal(a.xp, 50); assert.equal(a.level, 1)
  a = up('SET xp = if_not_exists(xp, :z) + :n', { ':z': 0, ':n': 25 })
  assert.equal(a.xp, 75)
  a = up('SET hist = list_append(if_not_exists(hist, :e), :h)', { ':e': [], ':h': [{ x: 1 }] })
  a = up('SET hist = list_append(if_not_exists(hist, :e), :h)', { ':e': [], ':h': [{ x: 2 }] })
  assert.deepEqual(a.hist, [{ x: 1 }, { x: 2 }])
  a = up('ADD solved :s, cnt :one', { ':s': ['p1'], ':one': 1 })
  a = up('ADD solved :s, cnt :one', { ':s': ['p1', 'p2'], ':one': 1 })
  assert.deepEqual(a.solved, ['p1', 'p2']); assert.equal(a.cnt, 2)
  a = up('SET langs.#py = if_not_exists(langs.#py, :z) + :one REMOVE hist', { ':z': 0, ':one': 1 }, { '#py': 'python' })
  assert.equal(a.langs.python, 1); assert.equal(a.hist, undefined)
})

test('conditional writes enforce uniqueness and guard duplicates', () => {
  const s = new LocalStore(tmpFile())
  const reg = () => s.send(new PutCommand({ TableName: 'studymate_auth_users', Item: { email: 'a@b.c' }, ConditionExpression: 'attribute_not_exists(email)' }))
  reg()
  assert.throws(reg, ConditionalCheckFailedException)
  const solve = () => s.send(new UpdateCommand({
    TableName: 'studymate_gamification', Key: { userId: 'u1' },
    UpdateExpression: 'SET xp = if_not_exists(xp, :z) + :n, solvedProblems = list_append(if_not_exists(solvedProblems, :e), :p)',
    ConditionExpression: 'attribute_not_exists(solvedProblems) OR NOT contains(solvedProblems, :pid)',
    ExpressionAttributeValues: { ':z': 0, ':n': 50, ':e': [], ':p': ['two-sum'], ':pid': 'two-sum' }, ReturnValues: 'ALL_NEW'
  }))
  assert.equal(solve().Attributes.xp, 50)
  assert.throws(solve, ConditionalCheckFailedException)
  assert.equal(s.send(new GetCommand({ TableName: 'studymate_gamification', Key: { userId: 'u1' } })).Item.xp, 50)
})

test('persists atomically across reloads and migrates legacy object-shaped tables', () => {
  const f = tmpFile()
  fs.writeFileSync(f, JSON.stringify({
    studymate_gamification: { u1: { userId: 'u1', xp: 10 } },
    studymate_chats: { c1: { userId: 'u1', chatId: 'c1', title: 'legacy' } },
    unknown_table: [{ x: 1 }]
  }))
  const s = new LocalStore(f)
  assert.equal(s.send(new GetCommand({ TableName: 'studymate_gamification', Key: { userId: 'u1' } })).Item.xp, 10)
  s.send(new PutCommand({ TableName: 'studymate_contests', Item: { contestId: 'k1', participants: [] } }))
  const s2 = new LocalStore(f)
  assert.ok(s2.send(new GetCommand({ TableName: 'studymate_contests', Key: { contestId: 'k1' } })).Item)
  assert.equal(s2.send(new GetCommand({ TableName: 'studymate_chats', Key: { userId: 'u1', chatId: 'c1' } })).Item.title, 'legacy')
  assert.equal(fs.readdirSync(path.dirname(f)).filter(n => n.endsWith('.tmp')).length, 0)
})

test('corrupt database file refuses to load instead of wiping data', () => {
  const f = tmpFile()
  fs.writeFileSync(f, '{ not json')
  assert.throws(() => new LocalStore(f), /not valid JSON/)
})

test('returned items are copies (no accidental shared mutation)', () => {
  const s = new LocalStore(tmpFile())
  s.send(new PutCommand({ TableName: 'studymate_contests', Item: { contestId: 'k', participants: [] } }))
  s.send(new GetCommand({ TableName: 'studymate_contests', Key: { contestId: 'k' } })).Item.participants.push('x')
  assert.deepEqual(s.send(new GetCommand({ TableName: 'studymate_contests', Key: { contestId: 'k' } })).Item.participants, [])
  s.send(new BatchWriteCommand({ RequestItems: { studymate_contests: [{ DeleteRequest: { Key: { contestId: 'k' } } }] } }))
  assert.equal(s.send(new ScanCommand({ TableName: 'studymate_contests' })).Items.length, 0)
})
