import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama3-8b-8192'

export const handleChat = async (req, res) => {
    try {
        const { messages, max_tokens, temperature } = req.body
        
        const response = await axios.post(GROQ_URL, {
            model: GROQ_MODEL,
            max_tokens: max_tokens || 1024,
            temperature: temperature || 0.7,
            messages
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        const reply = response.data.choices?.[0]?.message?.content || ''
        res.json({ reply })
    } catch (err) {
        console.error('Groq Error:', err.response?.data || err.message)
        res.status(500).json({ error: 'Failed to process AI chat request' })
    }
}

export const generateQuiz = async (req, res) => {
    try {
        const { text } = req.body

        // Create standard prompt mapping 
        const prompt = `Based strictly on the following text, generate a JSON array of 3 multiple-choice questions. 
Respond ONLY with raw JSON, nothing else. Format required: 
[{"q":"Question?","options":["A","B","C","D"],"ans":"The exact text of the correct option"}]
\nTEXT:\n${text.slice(0, 5000)}`

        const response = await axios.post(GROQ_URL, {
            model: GROQ_MODEL,
            temperature: 0.3,
            messages: [{ role: 'system', content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        const reply = response.data.choices?.[0]?.message?.content || '[]'
        const parsed = JSON.parse(reply.replace(/```json/g, '').replace(/```/g, '').trim())
        res.json(parsed)
    } catch (err) {
        console.error('Groq Quiz Error:', err.response?.data || err.message)
        res.status(500).json({ error: 'Failed to generate quiz' })
    }
}

export const summarizeText = async (req, res) => {
    try {
        const { text } = req.body
        const prompt = `You are a helpful study assistant. Summarize the following document into key concepts and important facts. Use bullet points and appropriate headings.
\nTEXT:\n${text.slice(0, 5000)}`

        const response = await axios.post(GROQ_URL, {
            model: GROQ_MODEL,
            temperature: 0.5,
            messages: [{ role: 'system', content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        const summary = response.data.choices?.[0]?.message?.content || ''
        res.json({ summary })
    } catch (err) {
        console.error('Groq Summarize Error:', err.response?.data || err.message)
        res.status(500).json({ error: 'Failed to generate summary' })
    }
}
