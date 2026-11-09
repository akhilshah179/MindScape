import { test } from 'node:test'
import assert from 'node:assert/strict'
process.env.MINDSCAPE_NO_LISTEN = '1'
const { normalizeQuestion, parseJsonLoose } = await import('../services/aiService.js')
const { chunkPages, retrieveChunks, sampleChunks, isPdfBuffer } = await import('../services/documentService.js')
const { compareOutputs } = await import('../services/codeWrapper.js')
const { withLock } = await import('../services/lock.js')

test('quiz questions: valid ones normalised, ambiguous ones rejected (never default to option 0)', () => {
  const opts = ['Alpha', 'Beta', 'Gamma', 'Delta']
  assert.equal(normalizeQuestion({ question: 'Q?', options: opts, answer: 2, explanation: 'x' }).answer, 2)
  assert.equal(normalizeQuestion({ question: 'Q?', options: opts, answer: 'C' }).answer, 2)
  assert.equal(normalizeQuestion({ question: 'Q?', options: opts, ans: 'delta' }).answer, 3)
  assert.equal(normalizeQuestion({ question: 'Q?', options: ['A) Alpha', 'B) Beta', 'C) Gamma', 'D) Delta'], answer: 1 }).options[1], 'Beta')
  assert.equal(normalizeQuestion({ question: 'Q?', options: opts, answer: 'Epsilon' }), null)
  assert.equal(normalizeQuestion({ question: 'Q?', options: opts, answer: 7 }), null)
  assert.equal(normalizeQuestion({ question: 'Q?', options: opts }), null)
  assert.equal(normalizeQuestion({ question: 'Q?', options: ['a', 'a', 'b', 'c'], answer: 0 }), null)
  assert.equal(normalizeQuestion({ question: 'Q?', options: ['a', 'b', 'c'], answer: 0 }), null)
  assert.equal(normalizeQuestion({ question: '', options: opts, answer: 0 }), null)
})

test('loose JSON parsing handles fences and surrounding prose', () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(parseJsonLoose('Sure! Here you go: [1,2] Hope it helps'), [1, 2])
  assert.equal(parseJsonLoose('no json here'), null)
})

test('chunking overlaps and keeps page numbers; retrieval finds the relevant page', () => {
  const filler = 'General introduction text about many unrelated subjects. '.repeat(60)
  const pages = [filler, 'The mitochondria is the powerhouse of the cell and produces ATP via respiration. ' + filler, filler]
  const chunks = chunkPages(pages)
  assert.ok(chunks.length > 3)
  assert.ok(chunks.every(c => c.text.length <= 1500))
  const top = retrieveChunks(chunks, 'what produces ATP in the cell?', { budget: 1600 })
  assert.equal(top[0].page, 2)
  assert.match(top[0].text, /mitochondria/)
  // no lexical match -> falls back to beginning of doc rather than nothing
  assert.ok(retrieveChunks(chunks, 'summarize').length > 0)
  assert.ok(sampleChunks(chunks, 3000).length <= 2)
  assert.equal(isPdfBuffer(Buffer.from('%PDF-1.7 ...')), true)
  assert.equal(isPdfBuffer(Buffer.from('<html>')), false)
})

test('output comparison', () => {
  assert.ok(compareOutputs('[0, 1]', '[0,1]', 'int[]'))
  assert.ok(compareOutputs('[1,0]', '[0,1]', 'int[]', true))
  assert.ok(!compareOutputs('[1,0]', '[0,1]', 'int[]', false))
  assert.ok(compareOutputs('2.5', '2.50000', 'double'))
  assert.ok(!compareOutputs('2.6', '2.50000', 'double'))
  assert.ok(compareOutputs('True', 'true', 'bool'))
  assert.ok(!compareOutputs('', '6', 'int'))
  assert.ok(!compareOutputs(null, '6', 'int'))
  assert.ok(compareOutputs('[["b","a"],["c"]]', '[["c"],["a","b"]]', 'string[][]', true))
})

test('withLock serialises same key, parallelises different keys', async () => {
  const order = []
  const slow = (k, id, ms) => withLock(k, async () => { order.push(`${id}:start`); await new Promise(r => setTimeout(r, ms)); order.push(`${id}:end`) })
  await Promise.all([slow('a', 1, 30), slow('a', 2, 1), slow('b', 3, 1)])
  assert.ok(order.indexOf('1:end') < order.indexOf('2:start'))
  assert.ok(order.indexOf('3:end') < order.indexOf('1:end'))
})
