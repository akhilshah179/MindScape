// Local, file-backed implementation of the DynamoDB DocumentClient commands the app uses.
// Semantics follow DynamoDB: items are addressed by the table's key schema (config/tables.js),
// Query requires the partition key, Update/Condition expressions are evaluated properly,
// and failed conditions throw ConditionalCheckFailedException.
//
// Durability: the whole store is kept in memory and every mutation is flushed with an atomic
// write (temp file + rename), so a crash mid-write can't corrupt the database file.
import fs from 'fs'
import path from 'path'
import { TABLES, getSchema } from './tables.js'

const clone = (v) => (v === undefined ? undefined : structuredClone(v))

export class ConditionalCheckFailedException extends Error {
  constructor(message = 'The conditional request failed') {
    super(message)
    this.name = 'ConditionalCheckFailedException'
  }
}

// ─── Expression tokenizer / parser ─────────────────────────────────────────────
function tokenize(expr) {
  const tokens = []
  const re = /\s*(<>|<=|>=|=|<|>|\(|\)|,|\+|-|[#:]?[A-Za-z_][A-Za-z0-9_]*(?:\.[#]?[A-Za-z_][A-Za-z0-9_]*)*)/y
  let m
  re.lastIndex = 0
  while (re.lastIndex < expr.length) {
    if (/^\s*$/.test(expr.slice(re.lastIndex))) break
    m = re.exec(expr)
    if (!m) throw new Error(`Cannot parse expression near: "${expr.slice(re.lastIndex)}"`)
    tokens.push(m[1])
  }
  return tokens
}

function makeCtx(input) {
  const names = input.ExpressionAttributeNames || {}
  const values = input.ExpressionAttributeValues || {}
  const resolvePath = (raw) => raw.split('.').map(p => (p.startsWith('#') ? names[p] ?? p : p))
  const getPath = (item, segs) => segs.reduce((o, k) => (o == null ? undefined : o[k]), item)
  const setPath = (item, segs, val) => {
    let o = item
    for (const k of segs.slice(0, -1)) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k] }
    o[segs[segs.length - 1]] = val
  }
  const removePath = (item, segs) => {
    const parent = getPath(item, segs.slice(0, -1))
    if (parent && typeof parent === 'object') delete parent[segs[segs.length - 1]]
  }
  const value = (tok) => {
    if (!(tok in values)) throw new Error(`Missing ExpressionAttributeValues entry ${tok}`)
    return clone(values[tok])
  }
  return { resolvePath, getPath, setPath, removePath, value }
}

// Condition grammar: or := and (OR and)* ; and := not (AND not)* ; not := NOT not | primary
function evalCondition(expr, item, input) {
  if (!expr) return true
  const ctx = makeCtx(input)
  const t = tokenize(expr)
  let i = 0
  const peek = () => t[i]
  const eat = (x) => { if (x && t[i] !== x) throw new Error(`Expected ${x} in "${expr}"`); return t[i++] }
  const operand = () => {
    const tok = eat()
    if (tok.startsWith(':')) return ctx.value(tok)
    if (tok === 'size') { eat('('); const v = operand(); eat(')'); return v == null ? 0 : (v.length ?? Object.keys(v).length) }
    return ctx.getPath(item || {}, ctx.resolvePath(tok))
  }
  const fn = (name) => {
    eat('(')
    const pathTok = eat()
    const segs = ctx.resolvePath(pathTok)
    let arg
    if (peek() === ',') { eat(','); arg = operand() }
    eat(')')
    const v = ctx.getPath(item || {}, segs)
    switch (name) {
      case 'attribute_exists': return v !== undefined
      case 'attribute_not_exists': return v === undefined
      case 'begins_with': return typeof v === 'string' && v.startsWith(arg)
      case 'contains': return Array.isArray(v) ? v.some(x => JSON.stringify(x) === JSON.stringify(arg)) : typeof v === 'string' && v.includes(arg)
      default: throw new Error(`Unsupported function ${name}`)
    }
  }
  const compare = (a, op, b) => {
    switch (op) {
      case '=': return JSON.stringify(a) === JSON.stringify(b)
      case '<>': return JSON.stringify(a) !== JSON.stringify(b)
      case '<': return a < b
      case '<=': return a <= b
      case '>': return a > b
      case '>=': return a >= b
    }
  }
  const primary = () => {
    if (peek() === '(') { eat('('); const v = orExpr(); eat(')'); return v }
    if (['attribute_exists', 'attribute_not_exists', 'begins_with', 'contains'].includes(peek())) return fn(eat())
    const left = operand()
    const op = eat()
    if (op === 'BETWEEN') { const lo = operand(); eat('AND'); const hi = operand(); return left >= lo && left <= hi }
    return compare(left, op, operand())
  }
  const notExpr = () => (peek() === 'NOT' ? (eat(), !notExpr()) : primary())
  const andExpr = () => { let v = notExpr(); while (peek() === 'AND') { eat(); const r = notExpr(); v = v && r } return v }
  const orExpr = () => { let v = andExpr(); while (peek() === 'OR') { eat(); const r = andExpr(); v = v || r } return v }
  const result = orExpr()
  if (i < t.length) throw new Error(`Unexpected token "${t[i]}" in "${expr}"`)
  return result
}

function applyUpdate(expr, item, input) {
  const ctx = makeCtx(input)
  const t = tokenize(expr)
  let i = 0
  const peek = () => t[i]
  const eat = (x) => { if (x && t[i] !== x) throw new Error(`Expected ${x} in "${expr}"`); return t[i++] }
  const CLAUSES = ['SET', 'ADD', 'REMOVE', 'DELETE']

  const operand = () => {
    const tok = eat()
    if (tok.startsWith(':')) return ctx.value(tok)
    if (tok === 'if_not_exists') {
      eat('('); const segs = ctx.resolvePath(eat()); eat(','); const def = operand(); eat(')')
      const cur = ctx.getPath(item, segs)
      return cur === undefined ? def : clone(cur)
    }
    if (tok === 'list_append') {
      eat('('); const a = operand(); eat(','); const b = operand(); eat(')')
      return [...(a || []), ...(b || [])]
    }
    return clone(ctx.getPath(item, ctx.resolvePath(tok)))
  }
  const valueExpr = () => {
    let v = operand()
    while (peek() === '+' || peek() === '-') {
      const op = eat(); const r = operand()
      v = op === '+' ? Number(v) + Number(r) : Number(v) - Number(r)
    }
    return v
  }

  // Evaluate every right-hand side against the ORIGINAL item (DynamoDB semantics), then apply.
  const ops = []
  while (i < t.length) {
    const clause = eat()
    if (!CLAUSES.includes(clause)) throw new Error(`Unexpected "${clause}" in UpdateExpression`)
    do {
      if (peek() === ',') eat(',')
      const segs = ctx.resolvePath(eat())
      if (clause === 'SET') { eat('='); ops.push(['set', segs, valueExpr()]) }
      else if (clause === 'REMOVE') ops.push(['remove', segs])
      else if (clause === 'ADD') {
        const v = operand(); const cur = ctx.getPath(item, segs)
        ops.push(['set', segs, Array.isArray(v) ? [...new Set([...(cur || []), ...v])] : Number(cur || 0) + Number(v)])
      } else if (clause === 'DELETE') {
        const v = operand(); const cur = ctx.getPath(item, segs) || []
        ops.push(['set', segs, cur.filter(x => !v.includes(x))])
      }
    } while (peek() === ',')
  }
  for (const [op, segs, v] of ops) {
    if (op === 'set') ctx.setPath(item, segs, v)
    else ctx.removePath(item, segs)
  }
  return item
}

// ─── Store ─────────────────────────────────────────────────────────────────────
export class LocalStore {
  constructor(filePath) {
    this.filePath = filePath
    this.tables = {}
    this.#load()
  }

  #load() {
    let raw = {}
    if (fs.existsSync(this.filePath)) {
      const text = fs.readFileSync(this.filePath, 'utf8')
      try {
        raw = JSON.parse(text)
      } catch (err) {
        // Never silently start empty over a corrupt file: that would destroy user data on next write.
        throw new Error(`Local database ${this.filePath} is not valid JSON (${err.message}). Fix or move it before starting.`)
      }
    }
    for (const name of Object.keys(TABLES)) this.tables[name] = new Map()
    // Accept both the legacy shapes (object maps / arrays) and the current array shape.
    for (const [name, data] of Object.entries(raw)) {
      if (!TABLES[name]) continue
      const items = Array.isArray(data) ? data : Object.values(data || {})
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const k = this.#keyOf(name, item, true)
        if (k) this.tables[name].set(k, item)
      }
    }
  }

  #flush() {
    const out = {}
    for (const [name, map] of Object.entries(this.tables)) out[name] = [...map.values()]
    const tmp = `${this.filePath}.${process.pid}.tmp`
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2))
    fs.renameSync(tmp, this.filePath)
  }

  #keyOf(table, obj, lenient = false) {
    const { pk, sk } = getSchema(table)
    if (obj[pk] === undefined || obj[pk] === null || (sk && (obj[sk] === undefined || obj[sk] === null))) {
      if (lenient) return null
      throw Object.assign(new Error(`ValidationException: key for ${table} requires ${pk}${sk ? ` and ${sk}` : ''}`), { name: 'ValidationException', status: 400 })
    }
    return sk ? `${obj[pk]}\u0000${obj[sk]}` : String(obj[pk])
  }

  #table(name) {
    getSchema(name)
    return this.tables[name]
  }

  send(command) {
    const type = command.constructor.name.replace(/Command$/, '')
    const input = command.input || {}
    switch (type) {
      case 'Put': return this.#put(input)
      case 'Get': return this.#get(input)
      case 'Delete': return this.#delete(input)
      case 'Update': return this.#update(input)
      case 'Query': return this.#query(input)
      case 'Scan': return this.#scan(input)
      case 'BatchWrite': return this.#batchWrite(input)
      default: throw new Error(`LocalStore does not implement ${command.constructor.name}`)
    }
  }

  #put({ TableName, Item, ConditionExpression, ...rest }) {
    const t = this.#table(TableName)
    const key = this.#keyOf(TableName, Item)
    if (ConditionExpression && !evalCondition(ConditionExpression, t.get(key), rest)) throw new ConditionalCheckFailedException()
    t.set(key, clone(Item))
    this.#flush()
    return {}
  }

  #get({ TableName, Key }) {
    const item = this.#table(TableName).get(this.#keyOf(TableName, Key))
    return { Item: clone(item) }
  }

  #delete({ TableName, Key, ConditionExpression, ReturnValues, ...rest }) {
    const t = this.#table(TableName)
    const key = this.#keyOf(TableName, Key)
    const existing = t.get(key)
    if (ConditionExpression && !evalCondition(ConditionExpression, existing, rest)) throw new ConditionalCheckFailedException()
    t.delete(key)
    this.#flush()
    return ReturnValues === 'ALL_OLD' ? { Attributes: clone(existing) } : {}
  }

  #update({ TableName, Key, UpdateExpression, ConditionExpression, ReturnValues, ...rest }) {
    const t = this.#table(TableName)
    const key = this.#keyOf(TableName, Key)
    const existing = t.get(key)
    const ctxInput = { ExpressionAttributeNames: rest.ExpressionAttributeNames, ExpressionAttributeValues: rest.ExpressionAttributeValues }
    if (ConditionExpression && !evalCondition(ConditionExpression, existing, ctxInput)) throw new ConditionalCheckFailedException()
    const item = existing ? clone(existing) : clone(Key)
    applyUpdate(UpdateExpression, item, ctxInput)
    // Key attributes are immutable
    Object.assign(item, Key)
    t.set(key, item)
    this.#flush()
    if (ReturnValues === 'ALL_NEW') return { Attributes: clone(item) }
    if (ReturnValues === 'ALL_OLD') return { Attributes: clone(existing) }
    return {}
  }

  #query({ TableName, KeyConditionExpression, FilterExpression, ScanIndexForward = true, Limit, ...rest }) {
    if (!KeyConditionExpression) throw new Error('Query requires KeyConditionExpression')
    const { sk } = getSchema(TableName)
    const ctxInput = { ExpressionAttributeNames: rest.ExpressionAttributeNames, ExpressionAttributeValues: rest.ExpressionAttributeValues }
    let items = [...this.#table(TableName).values()].filter(it => evalCondition(KeyConditionExpression, it, ctxInput))
    if (sk) items.sort((a, b) => String(a[sk]).localeCompare(String(b[sk])))
    if (!ScanIndexForward) items.reverse()
    if (FilterExpression) items = items.filter(it => evalCondition(FilterExpression, it, ctxInput))
    if (Limit) items = items.slice(0, Limit)
    return { Items: items.map(clone), Count: items.length }
  }

  #scan({ TableName, FilterExpression, Limit, ...rest }) {
    const ctxInput = { ExpressionAttributeNames: rest.ExpressionAttributeNames, ExpressionAttributeValues: rest.ExpressionAttributeValues }
    let items = [...this.#table(TableName).values()]
    if (FilterExpression) items = items.filter(it => evalCondition(FilterExpression, it, ctxInput))
    if (Limit) items = items.slice(0, Limit)
    return { Items: items.map(clone), Count: items.length }
  }

  #batchWrite({ RequestItems = {} }) {
    for (const [TableName, reqs] of Object.entries(RequestItems)) {
      const t = this.#table(TableName)
      for (const r of reqs) {
        if (r.PutRequest) t.set(this.#keyOf(TableName, r.PutRequest.Item), clone(r.PutRequest.Item))
        if (r.DeleteRequest) t.delete(this.#keyOf(TableName, r.DeleteRequest.Key))
      }
    }
    this.#flush()
    return { UnprocessedItems: {} }
  }
}

export { evalCondition, applyUpdate }
