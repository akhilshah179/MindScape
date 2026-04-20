const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY // store in .env

export async function groqChat({ messages, temperature = 0.7, max_tokens = 1024 }) {
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant', // Updated from decommissioned model
                messages,
                temperature,
                max_tokens
            })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error?.message || 'Groq API error')
        return data.choices[0].message.content
    } catch (error) {
        console.error("Groq API Error:", error)
        throw error // throw instead of returning string — let callers handle it
    }
}

export async function groqChatWithContext(contextText, messages) {
    const systemPrompt = {
        role: 'system',
        content: `You are a helpful AI study assistant. Answer questions based on the following document context.
ALWAYS format your response with bullet points, numbered lists, and distinct paragraphs for easy reading. 
Use **bold** for key terms. Avoid long unbroken walls of text. Be point-wise and structured.

CONTEXT:
${contextText}`
    };
    return await groqChat({
        messages: [systemPrompt, ...messages],
        temperature: 0.5
    });
}