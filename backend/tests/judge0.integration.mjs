// Real Judge0 integration check: reference solutions must be Accepted,
// broken ones must not. Requires network access to JUDGE0_API_URL.
// Run: node tests/judge0.integration.mjs
import '../config/env.js'
import { runTestCases } from '../services/judge0Service.js'
import { getProblemById } from '../services/problemsData.js'
import { SOLUTIONS } from './solutions.fixture.mjs'

const NEGATIVE = [
  { name: 'wrong answer (python)', language: 'python', code: `class Solution:\n    def twoSum(self, nums, target):\n        return [0, 0]`, expect: 'Wrong Answer' },
  { name: 'compile error (cpp)', language: 'cpp', code: `class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { return nums } };`, expect: 'Compilation Error' },
  { name: 'runtime error (javascript)', language: 'javascript', code: `function twoSum(nums, target) { throw new Error('boom') }`, expect: 'Runtime Error' },
  { name: 'time limit (java)', language: 'java', code: `class Solution { public int[] twoSum(int[] nums, int target) { while(true){} } }`, expect: 'Time Limit Exceeded' },
  { name: 'empty stub (python)', language: 'python', code: `class Solution:\n    def twoSum(self, nums, target):\n        pass`, expect: 'Wrong Answer' },
]

let failures = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++ }

for (const [pid, langs] of Object.entries(SOLUTIONS)) {
  const p = getProblemById(pid)
  for (const [lang, code] of Object.entries(langs)) {
    const r = await runTestCases(code, lang, p.testCases, p.timeLimit, p.driverMeta)
    const bad = r.results.filter(x => !x.passed).map(x => `${x.verdict}: ${x.stderr || x.compile_output || x.actualOutput}`.slice(0, 300))
    check(r.allPassed, `${pid} [${lang}] ${r.passedTests}/${r.totalTests} ${bad.join(' | ')}`)
  }
}
const p = getProblemById('two-sum')
for (const n of NEGATIVE) {
  const r = await runTestCases(n.code, n.language, p.testCases, p.timeLimit, p.driverMeta)
  const verdicts = [...new Set(r.results.map(x => x.verdict))]
  check(!r.allPassed && verdicts.some(v => v.startsWith(n.expect)), `${n.name}: not accepted, verdicts=${verdicts.join(',')} (expected ${n.expect})`)
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Judge0 checks passed')
process.exit(failures ? 1 : 0)
