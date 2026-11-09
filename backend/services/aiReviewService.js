// AI features for the Coding Arena. Uses the shared Groq client (model fallback, retries,
// clear errors). No mock responses: if AI is unavailable the caller gets a real error.
import { callGroq, parseJsonLoose } from './aiService.js'
import { HttpError } from '../middleware/http.js'

const MAX_CODE = 20000
const fence = (language, code) => `\`\`\`${language}\n${String(code).slice(0, MAX_CODE)}\n\`\`\``

async function jsonCall(messages, { temperature = 0.3, max_tokens = 1500, validate }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await callGroq({ messages, temperature, max_tokens })
    const parsed = parseJsonLoose(reply)
    if (parsed && (!validate || validate(parsed))) return parsed
  }
  throw new HttpError(502, 'The AI returned an invalid response. Please try again.')
}

export const reviewCode = (code, language, problemTitle) => jsonCall([
  {
    role: 'system',
    content: `You are an expert code reviewer. Respond ONLY with JSON:
{"timeComplexity":"O(...)","spaceComplexity":"O(...)","codeQuality":1-10,"optimizationSuggestions":["..."],"alternativeApproaches":[{"name":"...","timeComplexity":"O(...)","description":"..."}]}`
  },
  { role: 'user', content: `Problem: "${problemTitle}"\nLanguage: ${language}\n\n${fence(language, code)}` }
], {
  validate: (p) => typeof p.timeComplexity === 'string' && typeof p.spaceComplexity === 'string'
}).then(p => ({
  timeComplexity: p.timeComplexity,
  spaceComplexity: p.spaceComplexity,
  codeQuality: Math.min(10, Math.max(1, Math.round(Number(p.codeQuality) || 5))),
  optimizationSuggestions: Array.isArray(p.optimizationSuggestions) ? p.optimizationSuggestions.map(String).slice(0, 8) : [],
  alternativeApproaches: Array.isArray(p.alternativeApproaches) ? p.alternativeApproaches.slice(0, 4) : []
}))

const HINT_LEVELS = {
  1: 'Give a GENERAL direction: the category of technique to think about, without naming the exact algorithm.',
  2: 'Name the specific data structure / algorithm and explain WHY it fits. No pseudocode or code.',
  3: 'Give a numbered pseudocode outline of the approach. Do NOT write code in any real programming language.'
}

export const generateHint = async (problemDescription, problemTitle, constraints = [], hintLevel = 1) => {
  const hint = await callGroq({
    messages: [
      { role: 'system', content: `You are a coding tutor. Never reveal full solution code. ${HINT_LEVELS[hintLevel] || HINT_LEVELS[1]}` },
      { role: 'user', content: `Problem "${problemTitle}":\n${problemDescription}\n\nConstraints: ${constraints.join(', ')}\n\nHint level ${hintLevel}/3.` }
    ],
    temperature: 0.5, max_tokens: 700
  })
  return { hintLevel, hint }
}

export const debugCode = (code, language, error) => jsonCall([
  {
    role: 'system',
    content: `You are an expert debugger. Respond ONLY with JSON:
{"errorType":"Syntax|Runtime|Logic","summary":"one line","problems":[{"line":1,"issue":"...","reason":"...","fix":"..."}],"correctedSnippet":"key corrected section only"}`
  },
  { role: 'user', content: `${fence(language, code)}\n\nError / output:\n${String(error).slice(0, 4000)}` }
], {
  temperature: 0.2,
  validate: (p) => typeof p.summary === 'string' && Array.isArray(p.problems)
})

const TOPICS = {
  DSA: 'Data Structures and Algorithms', OOP: 'Object Oriented Programming', DBMS: 'Database Management Systems',
  OS: 'Operating Systems', CN: 'Computer Networks', HR: 'HR and Behavioral Interview'
}

export const generateInterviewQuestions = async (topic, count = 5) => {
  const n = Math.min(Math.max(Number(count) || 5, 1), 10)
  const parsed = await jsonCall([
    {
      role: 'system',
      content: `You are a technical interview expert. Respond ONLY with JSON: {"questions":[{"question":"...","answer":"2-4 sentence model answer","difficulty":"Easy|Medium|Hard"}]}`
    },
    { role: 'user', content: `Generate ${n} realistic interview questions (mixed difficulty) on "${TOPICS[String(topic).toUpperCase()] || topic}".` }
  ], {
    temperature: 0.6, max_tokens: 2500,
    validate: (p) => Array.isArray(Array.isArray(p) ? p : p.questions)
  })
  const list = Array.isArray(parsed) ? parsed : parsed.questions
  return list.filter(q => q?.question && q?.answer).slice(0, n)
}

export const conductMockInterview = async (topic, history = []) => {
  const messages = [
    {
      role: 'system',
      content: `You are an experienced technical interviewer running a mock interview on "${topic}".
Ask one question at a time. After each answer, briefly evaluate it (correct / partially correct / incorrect), then ask a follow-up.
Start with an easy warm-up and increase difficulty. After 5-6 exchanges, finish with a feedback summary. Be concise, honest and encouraging.`
    },
    // Only user/assistant turns from the client; never let it inject system prompts.
    ...history
      .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
  ]
  if (messages.length === 1) messages.push({ role: 'user', content: `Start the mock interview on ${topic}. Ask me the first question.` })
  const reply = await callGroq({ messages, temperature: 0.7, max_tokens: 700 })
  return { reply, role: 'assistant' }
}
