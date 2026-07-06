import axios from 'axios'
import dotenv from 'dotenv'
import { wrapCode, compareOutputs } from './codeWrapper.js'
dotenv.config()

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com'
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || ''

const LANGUAGE_MAP = {
  cpp: 54,
  java: 62,
  python: 71,
  javascript: 63
}

const headers = JUDGE0_KEY ? {
  'X-RapidAPI-Key': JUDGE0_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
} : {}

export const getLanguageId = (language) => {
  const id = LANGUAGE_MAP[language.toLowerCase()]
  if (!id) throw new Error(`Unsupported language: ${language}`)
  return id
}

export const submitToJudge0 = async (code, languageId, stdin = '', expectedOutput = null, timeLimit = 2) => {
  try {
    const payload = {
      source_code: code,
      language_id: languageId,
      stdin: stdin,
      cpu_time_limit: timeLimit / 1000,
      memory_limit: 256000
    }

    if (expectedOutput !== null) {
      payload.expected_output = expectedOutput
    }

    const response = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 30000
      }
    )

    const { status, stdout, stderr, time, memory, compile_output } = response.data

    return {
      status: status,
      stdout: stdout ? stdout.trim() : null,
      stderr: stderr ? stderr.trim() : null,
      time: time,
      memory: memory,
      compile_output: compile_output ? compile_output.trim() : null
    }
  } catch (err) {
    console.error('Judge0 Submission Error:', err.response?.data || err.message)
    throw new Error('Failed to submit code to Judge0')
  }
}

export const runCode = async (code, language, stdin = '') => {
  try {
    const languageId = getLanguageId(language)
    const result = await submitToJudge0(code, languageId, stdin)

    return {
      verdict: getVerdict(result.status),
      stdout: result.stdout,
      stderr: result.stderr,
      time: result.time,
      memory: result.memory,
      compile_output: result.compile_output,
      statusId: result.status?.id
    }
  } catch (err) {
    console.error('Run Code Error:', err.message)
    throw err
  }
}

export const runTestCases = async (code, language, testCases, timeLimit = 2000, driverMeta = null) => {
  const languageId = getLanguageId(language)
  const results = []
  let allPassed = true

  // Wrap user code with driver code for stdin/stdout I/O
  const wrappedCode = wrapCode(code, language, driverMeta)

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]
    try {
      // Don't pass expectedOutput to Judge0 — we compare ourselves
      // for more flexible matching (order-independent, whitespace normalization)
      const result = await submitToJudge0(
        wrappedCode,
        languageId,
        tc.input,
        null,
        timeLimit
      )

      // Determine verdict using our comparison logic
      let verdict = getVerdict(result.status)
      let passed = false

      if (verdict === 'Accepted' || result.status?.id === 3) {
        // Judge0 reported Accepted (no expected_output was given, so status 3 means
        // code ran successfully). Now compare output ourselves.
        const orderIndependent = driverMeta?.orderIndependent || false
        const returnType = driverMeta?.returnType || ''

        passed = compareOutputs(
          result.stdout,
          tc.expectedOutput,
          returnType,
          orderIndependent
        )
        verdict = passed ? 'Accepted' : 'Wrong Answer'
      }

      if (!passed) allPassed = false

      results.push({
        testCase: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.stdout,
        verdict: verdict,
        passed: passed,
        time: result.time,
        memory: result.memory,
        stderr: result.stderr,
        compile_output: result.compile_output
      })
    } catch (err) {
      allPassed = false
      results.push({
        testCase: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: null,
        verdict: 'Runtime Error',
        passed: false,
        time: null,
        memory: null,
        stderr: err.message,
        compile_output: null
      })
    }
  }

  return {
    allPassed,
    totalTests: testCases.length,
    passedTests: results.filter(r => r.passed).length,
    results
  }
}

export const getVerdict = (status) => {
  if (!status || !status.id) return 'Unknown Error'

  const statusId = status.id
  const verdictMap = {
    1: 'In Queue',
    2: 'Processing',
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error (SIGSEGV)',
    8: 'Runtime Error (SIGXFSZ)',
    9: 'Runtime Error (SIGFPE)',
    10: 'Runtime Error (SIGABRT)',
    11: 'Runtime Error (NZEC)',
    12: 'Runtime Error (Other)',
    13: 'Internal Error',
    14: 'Exec Format Error'
  }

  if (statusId >= 7 && statusId <= 12) return 'Runtime Error'
  if (statusId === 6) return 'Compilation Error'
  if (statusId === 5) return 'Time Limit Exceeded'
  if (statusId === 4) return 'Wrong Answer'
  if (statusId === 3) return 'Accepted'

  return verdictMap[statusId] || 'Unknown Error'
}
