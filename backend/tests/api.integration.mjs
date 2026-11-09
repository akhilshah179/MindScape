// End-to-end API journey against a real server process, real Groq and real Judge0.
// Uses an isolated temp database + storage dir, so it never touches your data.
// Run: node tests/api.integration.mjs [--skip-ai] [--skip-judge0]
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { SOLUTIONS } from './solutions.fixture.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKIP_AI = process.argv.includes('--skip-ai')
const SKIP_JUDGE0 = process.argv.includes('--skip-judge0')
const PORT = 5000 + Math.floor(Math.random() * 900) + 50
const BASE = `http://127.0.0.1:${PORT}/api`
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mindscape-e2e-'))

let failures = 0, passes = 0
const check = (ok, msg, extra = '') => {
  if (ok) passes++; else failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}${!ok && extra ? `  -> ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 400)}` : ''}`)
}

function startServer(extraEnv = {}) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: String(PORT), DB_DRIVER: 'local', STORAGE_DRIVER: 'local',
      LOCAL_DB_PATH: path.join(tmp, 'db.json'), STORAGE_LOCAL_DIR: path.join(tmp, 'uploads'),
      AUTH_PROVIDER: 'local', JWT_SECRET: 'test-secret-'.padEnd(48, 'x'), CORS_ORIGINS: 'http://localhost:5173', ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let log = ''
  child.stdout.on('data', d => { log += d })
  child.stderr.on('data', d => { log += d })
  child.getLog = () => log
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const poll = async () => {
      try { if ((await fetch(`${BASE}/health`)).ok) return resolve(child) } catch { /* not up yet */ }
      if (Date.now() - t0 > 15000) { child.kill(); return reject(new Error('server did not start:\n' + log)) }
      setTimeout(poll, 200)
    }
    poll()
  })
}

async function api(method, url, { token, body, headers = {}, raw = false } = {}) {
  const isForm = body instanceof FormData
  const res = await fetch(BASE + url, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  })
  if (raw) return res
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, headers: res.headers }
}

function pdfForm(buf, name = 'notes.pdf', subject = 'Testing') {
  const fd = new FormData()
  fd.append('subjectName', subject)
  fd.append('file', new Blob([buf], { type: 'application/pdf' }), name)
  return fd
}

let server = await startServer()
try {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  console.log('\n# Auth & isolation')
  const alice = await api('POST', '/auth/register', { body: { email: 'alice@example.com', password: 'correct horse', name: 'Alice' } })
  check(alice.status === 201 && alice.data.token, 'register returns token', alice.data)
  const bob = await api('POST', '/auth/register', { body: { email: 'bob@example.com', password: 'battery staple', name: 'Bob' } })
  const A = alice.data.token, B = bob.data.token
  check((await api('POST', '/auth/register', { body: { email: 'ALICE@example.com', password: 'whatever12' } })).status === 409, 'duplicate email (case-insensitive) rejected')
  check((await api('POST', '/auth/register', { body: { email: 'x@y.z', password: 'short' } })).status === 400, 'weak password rejected')
  check((await api('POST', '/auth/login', { body: { email: 'alice@example.com', password: 'wrong password' } })).status === 401, 'wrong password rejected')
  check((await api('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'whatever12' } })).status === 401, 'unknown user rejected (no auto-session)')
  const login = await api('POST', '/auth/login', { body: { email: 'alice@example.com', password: 'correct horse' } })
  check(login.status === 200 && login.data.user.userId === 'alice_example_com', 'login works, legacy-compatible userId', login.data)
  check((await api('GET', '/chat')).status === 401, 'no token -> 401')
  check((await api('GET', '/chat', { token: A.slice(0, -4) + 'AAAA' })).status === 401, 'tampered token -> 401')
  check((await api('GET', '/chat', { headers: { 'x-user-id': 'alice_example_com' } })).status === 401, 'x-user-id header is not accepted as identity')
  const cors = await fetch(`${BASE}/health`, { headers: { Origin: 'https://evil.example' } })
  check(!cors.headers.get('access-control-allow-origin'), 'CORS rejects unknown origin')
  const corsOk = await fetch(`${BASE}/health`, { headers: { Origin: 'http://localhost:5173' } })
  check(corsOk.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS allows configured origin')

  // ── 2. Files ──────────────────────────────────────────────────────────────
  console.log('\n# PDF upload / view / ownership')
  const pdf = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'public', 'pdfs', 'ml-unit1.pdf'))
  const up = await api('POST', '/files/upload', { token: A, body: pdfForm(pdf, 'ml-unit1.pdf', 'ML') })
  check(up.status === 201 && up.data.file.hasText === true && up.data.file.numPages > 0, 'upload PDF (text extracted server-side)', up.data)
  const fileId = up.data.file?.fileId
  const fake = await api('POST', '/files/upload', { token: A, body: pdfForm(Buffer.from('not a pdf at all'), 'evil.pdf') })
  check(fake.status === 400, 'non-PDF with .pdf name rejected by magic bytes')
  const list = await api('GET', '/files', { token: A })
  check(list.data.files?.length === 1 && list.data.files[0].fileId === fileId, 'list shows uploaded file')
  check((await api('GET', '/files', { token: B })).data.files.length === 0, "bob can't list alice's files")
  check((await api('GET', `/files/${fileId}/content`, { token: B })).status === 404, "bob can't read alice's PDF")
  check((await api('DELETE', `/files/${fileId}`, { token: B })).status === 404, "bob can't delete alice's PDF")
  const full = await api('GET', `/files/${fileId}/content`, { token: A, raw: true })
  const fullBuf = Buffer.from(await full.arrayBuffer())
  check(full.status === 200 && fullBuf.equals(pdf), 'full download is byte-identical')
  const part = await api('GET', `/files/${fileId}/content`, { token: A, raw: true, headers: { Range: 'bytes=0-99' } })
  const partBuf = Buffer.from(await part.arrayBuffer())
  check(part.status === 206 && partBuf.length === 100 && part.headers.get('content-range') === `bytes 0-99/${pdf.length}`, 'range request returns 206 partial content')
  check((await api('GET', `/files/${fileId}/content`, { token: A, raw: true, headers: { Range: `bytes=${pdf.length + 10}-` } })).status === 416, 'unsatisfiable range -> 416')

  // ── 3. Persistence across restart ─────────────────────────────────────────
  console.log('\n# Persistence across backend restart')
  const chat0 = await api('POST', '/chat', { token: A, body: { title: 'Persist me' } })
  await api('POST', '/memory', { token: A, body: { key: 'Exam Date', value: 'December 12' } })
  server.kill(); await new Promise(r => server.once('exit', r))
  server = await startServer()
  const relog = await api('POST', '/auth/login', { body: { email: 'alice@example.com', password: 'correct horse' } })
  check(relog.status === 200, 'account survives restart')
  check((await api('GET', '/files', { token: A })).data.files?.[0]?.fileId === fileId, 'file metadata survives restart')
  const afterRestart = await api('GET', `/files/${fileId}/content`, { token: A, raw: true })
  check(Buffer.from(await afterRestart.arrayBuffer()).equals(pdf), 'PDF bytes survive restart')
  check((await api('GET', '/chat', { token: A })).data.some(c => c.chatId === chat0.data.chatId), 'chat survives restart')
  check((await api('GET', '/memory', { token: A })).data.some(m => m.memoryKey === 'exam_date'), 'memory survives restart (key normalised)')

  // ── 4. Chats CRUD ─────────────────────────────────────────────────────────
  console.log('\n# Chat management')
  const c1 = (await api('POST', '/chat', { token: A })).data
  check(c1.chatId && c1.title === 'New Chat', 'create chat returns immediately')
  check((await api('GET', `/chat/${c1.chatId}/messages`, { token: B })).status === 404, "bob can't read alice's chat")
  check((await api('POST', `/chat/${c1.chatId}/messages`, { token: B, body: { content: 'hi' } })).status === 404, "bob can't post into alice's chat")
  check((await api('PATCH', `/chat/${c1.chatId}`, { token: A, body: { title: 'Renamed' } })).data.title === 'Renamed', 'rename chat')
  check((await api('POST', '/chat', { token: A, body: { fileId } })).status === 201, 'create chat attached to own PDF')
  check((await api('POST', '/chat', { token: B, body: { fileId } })).status === 404, "bob can't attach alice's PDF to his chat")
  check((await api('DELETE', `/chat/${chat0.data.chatId}`, { token: A })).status === 200 &&
    !(await api('GET', '/chat', { token: A })).data.some(c => c.chatId === chat0.data.chatId), 'delete chat')
  check((await api('GET', '/memory', { token: B })).data.length === 0, "bob can't see alice's memory")

  // ── 5. AI ─────────────────────────────────────────────────────────────────
  if (!SKIP_AI) {
    console.log('\n# StudyMate AI (real Groq)')
    let t0 = Date.now()
    const m1 = await api('POST', `/chat/${c1.chatId}/messages`, { token: A, body: { content: 'My name is Alice and I am preparing for my machine learning exam. What is overfitting? Answer in 2 sentences.' } })
    check(m1.status === 200 && m1.data.reply?.length > 20, `chat reply (${Date.now() - t0}ms)`, m1.data)
    const msgs = await api('GET', `/chat/${c1.chatId}/messages`, { token: A })
    check(msgs.data.messages?.length === 2 && msgs.data.messages[0].role === 'user' && msgs.data.messages[1].role === 'assistant', 'exactly one user + one assistant message persisted (no duplicates)', msgs.data.messages?.map(m => m.role))
    const m2 = await api('POST', `/chat/${c1.chatId}/messages`, { token: A, body: { content: 'What is my name? One word.' } })
    check(/alice/i.test(m2.data.reply || ''), 'conversation history is used', m2.data.reply)

    // Streaming
    t0 = Date.now()
    const sres = await fetch(`${BASE}/chat/${c1.chatId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${A}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ content: 'Name two regularization techniques, briefly.' })
    })
    const sText = await sres.text()
    const tokens = (sText.match(/event: token/g) || []).length
    const doneLine = sText.split('\n\n').find(b => b.startsWith('event: done'))
    check(sres.headers.get('content-type')?.includes('text/event-stream') && tokens > 1 && doneLine, `SSE streaming (${tokens} token events, ${Date.now() - t0}ms)`)

    // PDF-aware
    const pdfChat = (await api('POST', '/chat', { token: A, body: { fileId } })).data
    const pq = await api('POST', `/chat/${pdfChat.chatId}/messages`, { token: A, body: { content: 'According to this document, what are the types of machine learning it lists?' } })
    check(pq.status === 200 && /supervised/i.test(pq.data.reply || '') && /\b(p\.|page)\s*\d/i.test(pq.data.reply || ''), 'PDF-aware answer uses the document and cites pages', (pq.data.reply || pq.data).toString().slice(0, 300))

    // Summary + quiz
    t0 = Date.now()
    const sum = await api('POST', `/files/${fileId}/summary`, { token: A, body: {} })
    check(sum.status === 200 && sum.data.summary?.summary?.length > 100 && sum.data.cached === false, `summary generated (${Date.now() - t0}ms)`, sum.data)
    const sum2 = await api('POST', `/files/${fileId}/summary`, { token: A, body: {} })
    check(sum2.data.cached === true && sum2.data.summary.summaryId === sum.data.summary.summaryId, 'summary cached & retrieved, not regenerated')
    check((await api('GET', `/files/${fileId}/summary`, { token: B })).status === 404, "bob can't read alice's summary")
    t0 = Date.now()
    const quiz = await api('POST', `/files/${fileId}/quiz`, { token: A, body: {} })
    const qs = quiz.data.quiz?.questions || []
    const validQ = qs.length >= 3 && qs.every(q => q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && q.explanation)
    check(quiz.status === 200 && validQ, `quiz has ${qs.length} valid questions (${Date.now() - t0}ms)`, quiz.data)
    const answers = qs.map((q, i) => (i === 0 ? (q.answer + 1) % 4 : q.answer))
    const score = await api('POST', `/files/${fileId}/quiz/score`, { token: A, body: { answers, score: 999 } })
    check(score.status === 201 && score.data.score.score === qs.length - 1, 'quiz graded server-side (client score ignored)', score.data)
    check((await api('GET', '/users/me/scores', { token: A })).data.length === 1, 'quiz result persisted')

    // Memory extraction (background) — give it a moment
    await new Promise(r => setTimeout(r, 4000))
    const mem = (await api('GET', '/memory', { token: A })).data
    check(mem.some(m => m.source === 'auto'), 'AI memory auto-extracted from conversation', mem)
    const titled = (await api('GET', '/chat', { token: A })).data.find(c => c.chatId === c1.chatId)
    check(titled.title === 'Renamed', 'user-renamed title is not overwritten by AI title refinement', titled.title)

    // Code AI (previously always returned hardcoded mocks)
    const review = await api('POST', '/coding/ai/review', { token: A, body: { code: SOLUTIONS['two-sum'].python, language: 'python', problemTitle: 'Two Sum' } })
    check(review.status === 200 && /O\(/.test(review.data.timeComplexity) && !/mock/i.test(JSON.stringify(review.data)), 'AI code review is real', review.data)
  }

  // ── 6. Coding / Judge0 / gamification ─────────────────────────────────────
  if (!SKIP_JUDGE0) {
    console.log('\n# Coding Arena (real Judge0) + gamification')
    const prob = await api('GET', '/coding/problems/two-sum', { token: A })
    check(prob.status === 200 && !prob.data.testCases && prob.data.sampleTests?.length === 2, 'problem detail hides hidden test cases')
    const wrong = await api('POST', '/coding/submit', { token: A, body: { problemId: 'two-sum', language: 'python', code: 'class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]' } })
    check(wrong.data.verdict === 'Wrong Answer' && !wrong.data.gamification, 'wrong solution not Accepted, no XP', wrong.data.verdict)
    check(wrong.data.results?.[2]?.hidden === true && wrong.data.results[2].input === undefined, 'hidden test inputs are redacted in results')
    const ok = await api('POST', '/coding/submit', { token: A, body: { problemId: 'two-sum', language: 'python', code: SOLUTIONS['two-sum'].python } })
    check(ok.data.verdict === 'Accepted' && ok.data.gamification?.xpAwarded === 50, 'correct solution Accepted, 50 XP', ok.data)
    check(ok.data.gamification?.newBadges?.some(b => b.id === 'first-blood'), 'First Blood badge awarded on first solve (was broken)', ok.data.gamification)
    check(ok.data.gamification?.newBadges?.some(b => b.id === 'speed-demon'), 'Speed Demon earned: solved within 5 min of opening')
    const again = await api('POST', '/coding/submit', { token: A, body: { problemId: 'two-sum', language: 'javascript', code: SOLUTIONS['two-sum'].javascript } })
    check(again.data.verdict === 'Accepted' && again.data.gamification?.xpAwarded === 0, 'resubmitting a solved problem gives 0 XP')
    // concurrency: two simultaneous first-solves of the same problem must award once
    await api('GET', '/coding/problems/reverse-linked-list', { token: B })
    const [r1, r2] = await Promise.all([1, 2].map(() => api('POST', '/coding/submit', { token: B, body: { problemId: 'reverse-linked-list', language: 'cpp', code: SOLUTIONS['reverse-linked-list'].cpp } })))
    const xpSum = (r1.data.gamification?.xpAwarded || 0) + (r2.data.gamification?.xpAwarded || 0)
    check(r1.data.verdict === 'Accepted' && r2.data.verdict === 'Accepted' && xpSum === 50, `concurrent duplicate submits award XP once (total ${xpSum})`)
    const prof = (await api('GET', '/coding/gamification', { token: A })).data
    check(prof.xp === 50 && prof.totalSolved === 1 && prof.easySolved === 1 && prof.currentStreak === 1 && prof.languageUsage.python === 1 && prof.languageUsage.javascript === 1, 'profile totals consistent', prof)
    const subs = (await api('GET', '/coding/submissions', { token: A })).data
    check(subs.total === 3 && subs.submissions[0].language === 'javascript', 'submission history persisted, newest first')
    check((await api('GET', '/coding/submissions', { token: B })).data.submissions.every(s => s.userId === 'bob_example_com'), 'submission history isolated per user')
    const run = await api('POST', '/coding/run', { token: A, body: { problemId: 'two-sum', language: 'java', code: SOLUTIONS['two-sum'].java } })
    check(run.data.mode === 'tests' && run.data.allPassed && run.data.totalTests === 2, 'Run executes visible tests only')

    console.log('\n# Contests')
    const start = new Date(Date.now() - 60_000).toISOString(), end = new Date(Date.now() + 3600_000).toISOString()
    const bad = await api('POST', '/coding/contests', { token: A, body: { title: 'x', problemIds: ['nope'], startTime: start, endTime: end } })
    check(bad.status === 400, 'contest with unknown problem rejected')
    const ct = await api('POST', '/coding/contests', { token: A, body: { title: 'Weekly #1', problemIds: ['palindrome-number', 'climbing-stairs'], startTime: start, endTime: end } })
    check(ct.status === 201, 'create contest', ct.data)
    const cid = ct.data.contestId
    check((await api('GET', `/coding/contests/${cid}`, { token: A })).status === 200, 'get contest (was 404 in old local DB)')
    const notJoined = await api('POST', '/coding/submit', { token: B, body: { problemId: 'palindrome-number', language: 'python', contestId: cid, code: 'class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        s = str(x)\n        return s == s[::-1]' } })
    check(notJoined.data.verdict === 'Accepted' && notJoined.data.contest?.scored === false, 'not-joined user does not score')
    check((await api('POST', `/coding/contests/${cid}/join`, { token: B })).status === 200, 'join contest')
    check((await api('POST', `/coding/contests/${cid}/join`, { token: B })).status === 409, 'double join rejected')
    const cs = await api('POST', '/coding/submit', { token: B, body: { problemId: 'palindrome-number', language: 'python', contestId: cid, code: 'class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        s = str(x)\n        return s == s[::-1]' } })
    check(cs.data.contest?.scored === true && cs.data.contest.score === 100, 'contest submit scores 100', cs.data.contest)
    const cs2 = await api('POST', '/coding/submit', { token: B, body: { problemId: 'palindrome-number', language: 'python', contestId: cid, code: 'class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        return str(x) == str(x)[::-1]' } })
    check(cs2.data.contest?.scored === false, 'contest re-solve does not double score')
    const off = await api('POST', '/coding/submit', { token: B, body: { problemId: 'two-sum', language: 'javascript', contestId: cid, code: SOLUTIONS['two-sum'].javascript } })
    check(off.data.contest?.scored === false, 'problem outside the contest does not score')
    const lb = (await api('GET', `/coding/contests/${cid}/leaderboard`, { token: A })).data
    check(lb.leaderboard?.length === 1 && lb.leaderboard[0].userId === 'bob_example_com' && lb.leaderboard[0].score === 100 && lb.leaderboard[0].rank === 1, 'leaderboard updated', lb)
  }

  // ── 7. Meetings ───────────────────────────────────────────────────────────
  console.log('\n# Meetings')
  const room = await api('POST', '/meeting/rooms', { token: A, body: { title: 'Study group' } })
  if (room.status === 503) {
    check(true, 'meetings: LiveKit not configured -> clear 503 (skipped)')
  } else {
    check(room.status === 201 && /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(room.data.roomId), 'create room with unguessable code', room.data)
    const ta = await api('POST', `/meeting/rooms/${room.data.roomId}/token`, { token: A })
    const tb = await api('POST', `/meeting/rooms/${room.data.roomId}/token`, { token: B, body: { displayName: 'Bobby' } })
    const claims = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString())
    const ca = claims(ta.data.token), cb = claims(tb.data.token)
    check(ca.video.roomAdmin === true && ca.sub.startsWith('alice_example_com#'), 'host token: admin grant, identity bound to verified user')
    check(!cb.video.roomAdmin && cb.sub.startsWith('bob_example_com#') && cb.name === 'Bobby', 'guest token: no admin, verified identity')
    check((await api('POST', '/meeting/rooms/zzzz-zzzz-zzzz/token', { token: A })).status === 404, 'token for nonexistent room rejected')
    check((await api('POST', `/meeting/rooms/${room.data.roomId}/token`)).status === 401, 'token requires login')
  }
} catch (err) {
  failures++
  console.error('FATAL', err)
  console.error(server?.getLog?.())
} finally {
  server?.kill()
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log(`\n${passes} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
