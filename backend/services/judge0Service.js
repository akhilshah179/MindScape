import axios from 'axios'
import '../config/env.js'
import { wrapCode, compareOutputs } from './codeWrapper.js'
import { HttpError } from '../middleware/http.js'

const JUDGE0_URL = (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/+$/, '')
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || ''
// Parallel test-case executions per submission. The public CE endpoint is rate limited, keep this small.
const JUDGE0_CONCURRENCY = Math.max(1, Number(process.env.JUDGE0_CONCURRENCY) || 3)

// Defaults target ce.judge0.com: GCC 14, JDK 17, Python 3.12, Node 22.
// Older ids (e.g. Python 3.8 = 71) break modern starter code such as `list[int]` annotations.
// Self-hosted / RapidAPI instances can override with JUDGE0_LANGUAGE_IDS='{"python":71,...}'.
const DEFAULT_LANGUAGE_MAP = { cpp: 105, java: 91, python: 100, javascript: 102 }
let LANGUAGE_MAP = DEFAULT_LANGUAGE_MAP
if (process.env.JUDGE0_LANGUAGE_IDS) {
  try {
    LANGUAGE_MAP = { ...DEFAULT_LANGUAGE_MAP, ...JSON.parse(process.env.JUDGE0_LANGUAGE_IDS) }
  } catch {
    console.error('[judge0] JUDGE0_LANGUAGE_IDS is not valid JSON; using defaults.')
  }
}

export const SUPPORTED_LANGUAGES = Object.keys(DEFAULT_LANGUAGE_MAP)

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (JUDGE0_KEY) {
    if (JUDGE0_URL.includes('rapidapi.com')) {
      headers['X-RapidAPI-Key'] = JUDGE0_KEY
      headers['X-RapidAPI-Host'] = new URL(JUDGE0_URL).host
    } else {
      // Self-hosted Judge0 with AUTHN_TOKEN enabled
      headers['X-Auth-Token'] = JUDGE0_KEY
    }
  }
  return headers
}

const b64 = (s) => Buffer.from(s ?? '', 'utf8').toString('base64')
const unb64 = (s) => (s ? Buffer.from(s, 'base64').toString('utf8') : null)

export const getLanguageId = (language) => {
  const id = LANGUAGE_MAP[String(language || '').toLowerCase()]
  if (!id) {
    const err = new Error(`Unsupported language: ${language}`)
    err.status = 400
    throw err
  }
  return id
}

/**
 * Submit one execution to Judge0 synchronously (wait=true).
 * Everything is base64-encoded: compiler output frequently contains non-UTF-8 bytes,
 * which makes Judge0 reject plain-text responses.
 */
export const submitToJudge0 = async (code, languageId, stdin = '', timeLimitMs = 2000) => {
  const payload = {
    source_code: b64(code),
    language_id: languageId,
    stdin: b64(stdin),
    cpu_time_limit: Math.min(Math.max(timeLimitMs / 1000, 0.5), 15),
    memory_limit: 256000
  }

  let response
  try {
    response = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
      payload,
      { headers: buildHeaders(), timeout: 45000 }
    )
  } catch (err) {
    const status = err.response?.status
    console.error('[judge0] request failed:', status, err.response?.data || err.message)
    throw new HttpError(503, status === 429
      ? 'Code execution service is rate limited. Please wait a moment and try again.'
      : 'Code execution service is unavailable. Please try again shortly.')
  }

  const d = response.data || {}
  return {
    status: d.status,
    stdout: unb64(d.stdout)?.trim() ?? null,
    stderr: unb64(d.stderr)?.trim() ?? null,
    compile_output: unb64(d.compile_output)?.trim() ?? null,
    message: unb64(d.message)?.trim() ?? null,
    time: d.time,
    memory: d.memory
  }
}

export const getVerdict = (status) => {
  const id = status?.id
  if (!id) return 'Unknown Error'
  if (id === 3) return 'Accepted'
  if (id === 4) return 'Wrong Answer'
  if (id === 5) return 'Time Limit Exceeded'
  if (id === 6) return 'Compilation Error'
  if (id >= 7 && id <= 12) return 'Runtime Error'
  if (id === 1 || id === 2) return 'Processing'
  return 'Internal Error'
}

/** Raw run with custom stdin (playground mode). Code is executed as written. */
export const runCode = async (code, language, stdin = '') => {
  const languageId = getLanguageId(language)
  const result = await submitToJudge0(code, languageId, stdin)
  return {
    verdict: getVerdict(result.status),
    stdout: result.stdout,
    stderr: result.stderr,
    compile_output: result.compile_output,
    time: result.time,
    memory: result.memory,
    statusId: result.status?.id
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

// Order verdicts by severity so the submission verdict reflects the most relevant failure.
const VERDICT_PRIORITY = ['Compilation Error', 'Runtime Error', 'Time Limit Exceeded', 'Wrong Answer', 'Internal Error', 'Unknown Error']

/**
 * Run code against test cases. A test passes only if Judge0 ran it successfully (status 3)
 * AND our comparator matches the expected output. Nothing is assumed to pass.
 */
export const runTestCases = async (code, language, testCases, timeLimit = 2000, driverMeta = null) => {
  const languageId = getLanguageId(language)
  const wrappedCode = wrapCode(code, language, driverMeta)

  const evaluate = (tc, result) => {
    let verdict = getVerdict(result.status)
    let passed = false
    if (result.status?.id === 3) {
      passed = compareOutputs(result.stdout, tc.expectedOutput, driverMeta?.returnType || '', driverMeta?.orderIndependent || false)
      verdict = passed ? 'Accepted' : 'Wrong Answer'
    }
    return {
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: result.stdout,
      verdict,
      passed,
      time: result.time,
      memory: result.memory,
      stderr: result.stderr,
      compile_output: result.compile_output
    }
  }

  // Run the first case alone: if it fails to compile, every case would, so skip the rest.
  const results = []
  const first = evaluate(testCases[0], await submitToJudge0(wrappedCode, languageId, testCases[0].input, timeLimit))
  results.push(first)

  if (first.verdict === 'Compilation Error') {
    for (const tc of testCases.slice(1)) {
      results.push({ ...first, input: tc.input, expectedOutput: tc.expectedOutput })
    }
  } else if (testCases.length > 1) {
    const rest = await mapWithConcurrency(testCases.slice(1), JUDGE0_CONCURRENCY, async (tc) =>
      evaluate(tc, await submitToJudge0(wrappedCode, languageId, tc.input, timeLimit))
    )
    results.push(...rest)
  }

  results.forEach((r, i) => { r.testCase = i + 1 })
  const passedTests = results.filter(r => r.passed).length
  const allPassed = passedTests === testCases.length && testCases.length > 0
  const failedVerdicts = results.filter(r => !r.passed).map(r => r.verdict)
  const verdict = allPassed
    ? 'Accepted'
    : VERDICT_PRIORITY.find(v => failedVerdicts.includes(v)) || failedVerdicts[0] || 'Wrong Answer'

  const times = results.map(r => Number(r.time)).filter(Number.isFinite)
  const mems = results.map(r => Number(r.memory)).filter(Number.isFinite)

  return {
    allPassed,
    verdict,
    totalTests: testCases.length,
    passedTests,
    maxTime: times.length ? Math.max(...times) : null,
    maxMemory: mems.length ? Math.max(...mems) : null,
    results
  }
}
