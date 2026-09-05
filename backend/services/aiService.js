import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })
dotenv.config()

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const PRIMARY_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'groq/compound']
const MAX_CHUNK_SIZE = 10000 // characters per chunk for long documents

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Robust, high-speed Groq API caller with rate limit handling and instant model fallback
 */
export async function callGroq({ messages, temperature = 0.5, max_tokens = 1536, maxRetries = 2 }) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured in backend environment.')
    }

    let lastError = null

    for (const model of PRIMARY_MODELS) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.post(GROQ_URL, {
                    model,
                    temperature,
                    max_tokens,
                    messages
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                })

                const content = response.data?.choices?.[0]?.message?.content
                if (!content) throw new Error('Empty response received from Groq AI.')
                return content.trim()
            } catch (error) {
                lastError = error
                const status = error.response?.status
                const errorMsg = error.response?.data?.error?.message || error.message

                // If model not found or 429 rate limited, switch immediately to next model
                if (status === 404 || status === 429 || (errorMsg && (errorMsg.includes('does not exist') || errorMsg.includes('Rate limit')))) {
                    console.warn(`[aiService] Model ${model} returned ${status} (${errorMsg}). Switching immediately to next available model...`)
                    break // Try next model in PRIMARY_MODELS immediately
                }

                // Retry on network glitches
                if ((error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && attempt < maxRetries) {
                    await delay(1000 * Math.pow(2, attempt))
                    continue
                }

                break
            }
        }
    }

    throw new Error(`AI Service failed across all models: ${lastError?.message || 'Unknown error'}`)
}

/**
 * Intelligent chunking for long text documents
 */
function splitIntoChunks(text, maxLen = MAX_CHUNK_SIZE) {
    const paragraphs = text.split(/\n\s*\n/)
    const chunks = []
    let currentChunk = ''

    for (const para of paragraphs) {
        if ((currentChunk + '\n\n' + para).length > maxLen) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim())
            currentChunk = para
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
    }

    // If single paragraph is oversized, force slice
    if (chunks.length === 0 && text.length > 0) {
        for (let i = 0; i < text.length; i += maxLen) {
            chunks.push(text.slice(i, i + maxLen))
        }
    }

    return chunks
}

/**
 * Generate a structured, academic study summary from extracted PDF text
 */
export async function generateDocumentSummary(extractedText) {
    const cleanText = (extractedText || '').trim()

    if (!cleanText || cleanText.length < 30) {
        throw new Error('This PDF does not contain extractable text. Scanned or image-based PDFs require OCR.')
    }

    // If document is short/medium, single-pass comprehensive summary
    if (cleanText.length <= MAX_CHUNK_SIZE) {
        const systemPrompt = `You are an expert academic tutor and study assistant. 
Generate a comprehensive, structured study summary of the provided study material.

Formatting rules:
- Use clear Markdown formatting with emojis for section headers.
- Include the following sections where applicable to the content:
  - 📌 **Overview**: Brief high-level summary of the subject and main topic.
  - 💡 **Core Concepts & Key Points**: Bulleted breakdown of major ideas and principles.
  - 📖 **Definitions & Terminology**: Key terms with concise, clear definitions.
  - ⚙️ **Methods, Formulas & Examples**: Key processes, equations, or examples (if mentioned in text).
  - 🎯 **Key Takeaways & Summary**: 3-5 bulleted concluding highlights for quick revision.
- Use **bold** for key terms and concepts.
- Base your summary STRICTLY on the facts present in the text. Do not hallucinate or add unsupported facts.`

        return await callGroq({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please summarize the following document:\n\n${cleanText}` }
            ],
            temperature: 0.3,
            max_tokens: 1536
        })
    }

    // For longer documents: multi-stage summarization (chunk -> key facts -> synthesize)
    const chunks = splitIntoChunks(cleanText, MAX_CHUNK_SIZE)
    console.log(`[aiService] Processing long document with ${chunks.length} chunks (${cleanText.length} characters)...`)

    const chunkSummaries = []
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkPrompt = `Extract the key concepts, main points, and important definitions from section ${i + 1} of ${chunks.length} of a long academic document. Be factual, concise, and dense in bullet points:\n\n${chunk}`
        
        try {
            const partial = await callGroq({
                messages: [
                    { role: 'system', content: 'You are an academic summarization engine. Extract dense, factual bullet points.' },
                    { role: 'user', content: chunkPrompt }
                ],
                temperature: 0.3,
                max_tokens: 800
            })
            chunkSummaries.push(`### Section ${i + 1} Points:\n${partial}`)
        } catch (err) {
            console.warn(`[aiService] Error processing chunk ${i + 1}:`, err.message)
            // Continue with remaining chunks if one fails
        }
    }

    const combinedNotes = chunkSummaries.join('\n\n')

    // Final synthesis
    const finalPrompt = `You are an expert academic tutor and study assistant. 
Below are key point extractions from various sections of a long academic document. 
Synthesize these extractions into a single, cohesive, highly structured final study guide.

Required Markdown structure:
- 📌 **Overview**: High-level summary of the entire document.
- 💡 **Core Concepts & Key Points**: Synthesized major ideas and themes across all sections.
- 📖 **Definitions & Terminology**: Important vocabulary and terms.
- ⚙️ **Key Methods, Formulas & Practical Points**: Important techniques or equations mentioned.
- 🎯 **Key Takeaways**: Final summary points for exam/study review.

Use bold for key terms. Avoid repetition.

EXTRACTED SECTION NOTES:
${combinedNotes}`

    return await callGroq({
        messages: [
            { role: 'system', content: 'You are an expert study guide synthesizer.' },
            { role: 'user', content: finalPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2048
    })
}

/**
 * Generate structured, academic quiz questions (5 MCQs) from extracted PDF text
 */
export async function generateDocumentQuiz(extractedText) {
    const cleanText = (extractedText || '').trim()

    if (!cleanText || cleanText.length < 30) {
        throw new Error('This PDF does not contain enough extractable text to generate a quiz.')
    }

    const chunk = cleanText.slice(0, 8000)

    const systemPrompt = `You are an expert academic examiner and quiz creator.
Generate exactly 5 high-quality multiple choice questions based strictly on the provided study material.

Rules:
1. Every question must test a factual concept from the text.
2. Provide exactly 4 distinct answer choices per question.
3. Indicate the zero-based index of the correct answer (0 for first option, 1 for second, 2 for third, 3 for fourth).
4. Provide a brief 1-sentence explanation of why the answer is correct.
5. Return ONLY a valid JSON array. No conversational text, no markdown wrappers other than raw JSON.

JSON Schema format:
[
  {
    "question": "Clear, precise question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Brief explanation of the correct answer."
  }
]`

    const reply = await callGroq({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate 5 MCQ questions from this study material:\n\n${chunk}` }
        ],
        temperature: 0.2,
        max_tokens: 1536
    })

    // Safe JSON parsing with regex extraction
    let parsed = null
    try {
        const cleaned = reply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
        parsed = JSON.parse(cleaned)
    } catch {
        // Attempt to extract JSON array if wrapped in other text
        const jsonMatch = reply.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0])
            } catch (err) {
                console.warn('[aiService] Secondary JSON parse failed:', err.message)
            }
        }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Failed to generate structured quiz questions from the document.')
    }

    // Validate and sanitize questions
    const validQuestions = parsed
        .map((q, idx) => {
            const questionText = q.question || q.q || `Question ${idx + 1}`
            let options = q.options || q.choices || []
            if (!Array.isArray(options) || options.length < 2) return null

            // Ensure 4 options
            while (options.length < 4) {
                options.push(`Option ${String.fromCharCode(65 + options.length)}`)
            }
            options = options.slice(0, 4).map(opt => String(opt).trim())

            // Normalize answer index
            let answerIdx = 0
            if (typeof q.answer === 'number' && q.answer >= 0 && q.answer < options.length) {
                answerIdx = Math.floor(q.answer)
            } else if (typeof q.ans === 'number' && q.ans >= 0 && q.ans < options.length) {
                answerIdx = Math.floor(q.ans)
            } else if (typeof q.ans === 'string') {
                const match = options.findIndex(o => o.toLowerCase() === q.ans.toLowerCase())
                if (match >= 0) answerIdx = match
            } else if (typeof q.answer === 'string') {
                const match = options.findIndex(o => o.toLowerCase() === q.answer.toLowerCase())
                if (match >= 0) answerIdx = match
            }

            return {
                question: String(questionText).trim(),
                options,
                answer: answerIdx,
                explanation: q.explanation ? String(q.explanation).trim() : `The correct answer is: ${options[answerIdx]}`
            }
        })
        .filter(Boolean)

    if (validQuestions.length === 0) {
        throw new Error('AI generated invalid quiz questions format.')
    }

    return validQuestions
}

