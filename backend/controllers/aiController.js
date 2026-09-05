import { callGroq } from '../services/aiService.js'

/**
 * Handle generic chat request from frontend (e.g. PDFViewer or standalone AI widgets)
 */
export const handleChat = async (req, res) => {
    try {
        const { messages, max_tokens, temperature } = req.body
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required.' })
        }

        const reply = await callGroq({
            messages,
            temperature: temperature || 0.7,
            max_tokens: max_tokens || 1536
        })

        res.json({ reply })
    } catch (err) {
        console.error('Groq Chat Error:', err.message)
        res.status(500).json({ error: 'Failed to process AI chat request: ' + err.message })
    }
}

/**
 * Generate quiz questions based on provided text
 */
export const generateQuiz = async (req, res) => {
    try {
        const { text } = req.body
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'Document text is required to generate a quiz.' })
        }

        const prompt = `Based strictly on the following text, generate a JSON array of 3 multiple-choice questions. 
Respond ONLY with raw JSON, nothing else. Format required: 
[{"q":"Question?","options":["A","B","C","D"],"ans":"The exact text of the correct option"}]
\nTEXT:\n${text.slice(0, 6000)}`

        const reply = await callGroq({
            messages: [{ role: 'system', content: prompt }],
            temperature: 0.3,
            max_tokens: 1024
        })

        const cleaned = reply.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        res.json(parsed)
    } catch (err) {
        console.error('Groq Quiz Error:', err.message)
        res.status(500).json({ error: 'Failed to generate quiz: ' + err.message })
    }
}

/**
 * Summarize provided text
 */
export const summarizeText = async (req, res) => {
    try {
        const { text } = req.body
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'Text is required for summarization.' })
        }

        const prompt = `You are a helpful study assistant. Summarize the following document into key concepts and important facts. Use bullet points and appropriate headings.
\nTEXT:\n${text.slice(0, 8000)}`

        const summary = await callGroq({
            messages: [{ role: 'system', content: prompt }],
            temperature: 0.4,
            max_tokens: 1536
        })

        res.json({ summary })
    } catch (err) {
        console.error('Groq Summarize Error:', err.message)
        res.status(500).json({ error: 'Failed to generate summary: ' + err.message })
    }
}
