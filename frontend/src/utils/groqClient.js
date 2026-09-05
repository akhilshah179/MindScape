import axios from 'axios'
import { getAuthUser } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Route generic chat requests to MindScape backend /api/ai/chat
 */
export async function groqChat({ messages, temperature = 0.7, max_tokens = 1536 }) {
    const user = await getAuthUser().catch(() => null)
    const response = await axios.post(`${API_BASE}/ai/chat`, {
        messages,
        temperature,
        max_tokens
    }, {
        headers: {
            'x-user-id': user?.userId || ''
        }
    })

    const reply = response.data?.reply
    if (reply === undefined || reply === null) {
        throw new Error('Received empty response from backend AI service.')
    }
    return reply
}

/**
 * Chat with attached document context routed through backend
 */
export async function groqChatWithContext(contextText, messages) {
    const systemPrompt = {
        role: 'system',
        content: `You are a helpful AI study assistant. Answer questions based on the following document context.
ALWAYS format your response with bullet points, numbered lists, and distinct paragraphs for easy reading. 
Use **bold** for key terms. Avoid long unbroken walls of text. Be point-wise and structured.

CONTEXT:
${(contextText || '').slice(0, 8000)}`
    }

    return await groqChat({
        messages: [systemPrompt, ...(messages || [])],
        temperature: 0.5
    })
}