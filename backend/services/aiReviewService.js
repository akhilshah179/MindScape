import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const groqHeaders = {
  'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
  'Content-Type': 'application/json'
}

const parseJSON = (text) => {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned)
}

export const reviewCode = async (code, language, problemTitle) => {
  try {
    const prompt = `You are an expert code reviewer. Analyze the following ${language} code for the problem "${problemTitle}".

Respond ONLY with valid JSON in this exact format:
{
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "codeQuality": 7,
  "optimizationSuggestions": ["suggestion 1", "suggestion 2"],
  "alternativeApproaches": [
    { "name": "Approach Name", "timeComplexity": "O(n log n)", "description": "Brief description" }
  ]
}

Code to review:
\`\`\`${language}
${code}
\`\`\``

    if (!process.env.GROQ_API_KEY) {
      return {
        timeComplexity: "O(n) - Mocked",
        spaceComplexity: "O(1) - Mocked",
        codeQuality: 8,
        optimizationSuggestions: ["Add a GROQ_API_KEY to your .env file to enable real AI code reviews.", "This is a mock response."],
        alternativeApproaches: []
      }
    }

    const response = await axios.post(GROQ_URL, {
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    }, { headers: groqHeaders })

    const reply = response.data.choices?.[0]?.message?.content || '{}'
    return parseJSON(reply)
  } catch (err) {
    console.error('AI Review Error:', err.response?.data || err.message)
    throw new Error('Failed to generate AI code review')
  }
}

export const generateHint = async (problemDescription, problemTitle, constraints, hintLevel = 1) => {
  try {
    const levelInstructions = {
      1: 'Give a GENERAL direction hint. Mention the category of algorithm or data structure to think about, but do NOT name the specific algorithm. Be vague and encouraging.',
      2: 'Give a SPECIFIC hint. Name the exact algorithm or data structure to use (e.g., "Use a hash map" or "Use two pointers"). Explain WHY this approach works for this problem. Do NOT give pseudocode or code.',
      3: 'Give a DETAILED pseudocode outline of the approach. Break it into numbered steps. Do NOT reveal the full solution code. Do NOT write actual code in any programming language.'
    }

    const prompt = `You are a helpful coding tutor. A student is working on the problem "${problemTitle}".

Problem Description:
${problemDescription}

Constraints:
${constraints.join(', ')}

Hint Level: ${hintLevel}/3
Instructions: ${levelInstructions[hintLevel] || levelInstructions[1]}

IMPORTANT: Do NOT reveal the full solution code. Only provide hints at the requested level.

Respond with a clear, helpful hint.`

    if (!process.env.GROQ_API_KEY) {
      return { hintLevel, hint: "Please add a GROQ_API_KEY to your backend .env file to enable AI hints. This is a local mock hint!" }
    }

    const response = await axios.post(GROQ_URL, {
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    }, { headers: groqHeaders })

    const hint = response.data.choices?.[0]?.message?.content || 'No hint available.'
    return { hintLevel, hint }
  } catch (err) {
    console.error('AI Hint Error:', err.response?.data || err.message)
    throw new Error('Failed to generate AI hint')
  }
}

export const debugCode = async (code, language, error) => {
  try {
    const prompt = `You are an expert debugger. Analyze the following ${language} code and the error it produced.

Code:
\`\`\`${language}
${code}
\`\`\`

Error/Output:
${error}

Respond ONLY with valid JSON in this exact format:
{
  "errorType": "Syntax|Runtime|Logic",
  "summary": "Brief one-line summary of the issue",
  "problems": [
    {
      "line": 5,
      "issue": "What is wrong",
      "reason": "Why it causes the error",
      "fix": "How to fix it"
    }
  ],
  "correctedSnippet": "The corrected key section of code (not the full code)"
}`

    if (!process.env.GROQ_API_KEY) {
      return {
        errorType: "Offline",
        summary: "No GROQ_API_KEY configured",
        problems: [{ line: 1, issue: "Missing API Key", reason: "Local dev mode", fix: "Add GROQ_API_KEY to .env" }],
        correctedSnippet: "// Add API key to .env"
      }
    }

    const response = await axios.post(GROQ_URL, {
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    }, { headers: groqHeaders })

    const reply = response.data.choices?.[0]?.message?.content || '{}'
    return parseJSON(reply)
  } catch (err) {
    console.error('AI Debug Error:', err.response?.data || err.message)
    throw new Error('Failed to generate AI debug analysis')
  }
}

export const generateInterviewQuestions = async (topic, count = 5) => {
  try {
    const topicMap = {
      DSA: 'Data Structures and Algorithms',
      OOP: 'Object Oriented Programming',
      DBMS: 'Database Management Systems',
      OS: 'Operating Systems',
      CN: 'Computer Networks',
      HR: 'HR and Behavioral Interview'
    }

    const fullTopic = topicMap[topic.toUpperCase()] || topic

    const prompt = `You are a technical interview expert. Generate ${count} interview questions on the topic "${fullTopic}".

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "question": "The interview question",
    "answer": "A comprehensive model answer (2-4 sentences)",
    "difficulty": "Easy|Medium|Hard"
  }
]

Generate a mix of Easy, Medium, and Hard questions. Make them realistic interview questions that companies actually ask.`

    if (!process.env.GROQ_API_KEY) {
      return [
        {
          question: "How do you configure the Groq API key in this project?",
          answer: "You create a .env file in the backend directory and add GROQ_API_KEY=your_key.",
          difficulty: "Easy"
        }
      ]
    }

    const response = await axios.post(GROQ_URL, {
      model: GROQ_MODEL,
      temperature: 0.6,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    }, { headers: groqHeaders })

    const reply = response.data.choices?.[0]?.message?.content || '[]'
    return parseJSON(reply)
  } catch (err) {
    console.error('AI Interview Questions Error:', err.response?.data || err.message)
    throw new Error('Failed to generate interview questions')
  }
}

export const conductMockInterview = async (topic, conversationHistory = []) => {
  try {
    const systemMessage = {
      role: 'system',
      content: `You are an experienced technical interviewer conducting a mock interview on the topic "${topic}".

Your behavior:
- Ask one question at a time
- After the candidate answers, evaluate their response briefly (correct/partially correct/incorrect)
- Ask follow-up questions to dig deeper
- Be encouraging but honest
- If starting a new interview, begin with an easy warm-up question
- Gradually increase difficulty
- After 5-6 exchanges, wrap up with feedback summary

Keep responses concise and professional. Act exactly like a real interviewer would.`
    }

    const messages = [systemMessage, ...conversationHistory]

    if (conversationHistory.length === 0) {
      messages.push({
        role: 'user',
        content: `Start the mock interview on ${topic}. Ask me the first question.`
      })
    }

    if (!process.env.GROQ_API_KEY) {
      return { reply: "I cannot conduct the interview right now because the `GROQ_API_KEY` is missing in your backend `.env` file. Please set it up to start!", role: 'assistant' }
    }

    const response = await axios.post(GROQ_URL, {
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 512,
      messages
    }, { headers: groqHeaders })

    const reply = response.data.choices?.[0]?.message?.content || 'I apologize, could you repeat that?'
    return { reply, role: 'assistant' }
  } catch (err) {
    console.error('AI Mock Interview Error:', err.response?.data || err.message)
    throw new Error('Failed to conduct mock interview')
  }
}
