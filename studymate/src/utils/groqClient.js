const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY // store in .env

/**
 * Delay helper — returns a promise that resolves after `ms` milliseconds.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Core Groq API call with **automatic retry on rate-limit (429) errors**.
 *
 * - Reads the `retry-after` header from Groq's 429 response so we wait
 *   exactly the right amount of time.
 * - Falls back to exponential backoff (5 s → 10 s → 20 s) if the header
 *   is missing.
 * - Retries up to `maxRetries` times (default 3).
 */
export async function groqChat({ messages, temperature = 0.7, max_tokens = 1024, maxRetries = 3 }) {
    let lastError = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages,
                    temperature,
                    max_tokens
                })
            })

            // ── Handle rate-limit (429) — wait & retry ──
            if (response.status === 429) {
                const retryAfterHeader = response.headers.get('retry-after')
                // Groq often returns wait time in the error body too
                let waitSeconds = retryAfterHeader ? parseFloat(retryAfterHeader) : null

                if (!waitSeconds || isNaN(waitSeconds)) {
                    // Try to parse from response body
                    try {
                        const errBody = await response.json()
                        const match = errBody?.error?.message?.match(/try again in ([\d.]+)s/i)
                        if (match) waitSeconds = parseFloat(match[1])
                    } catch { /* ignore parse errors */ }
                }

                // Fallback: exponential backoff starting at 5 seconds
                if (!waitSeconds || isNaN(waitSeconds)) {
                    waitSeconds = 5 * Math.pow(2, attempt)
                }

                // Cap maximum wait at 60 seconds
                waitSeconds = Math.min(waitSeconds + 1, 60) // +1s buffer

                if (attempt < maxRetries) {
                    console.warn(`Groq rate limit hit. Waiting ${waitSeconds.toFixed(1)}s before retry ${attempt + 1}/${maxRetries}...`)
                    await delay(waitSeconds * 1000)
                    continue
                }
            }

            const data = await response.json()
            if (!response.ok) throw new Error(data.error?.message || 'Groq API error')
            return data.choices[0].message.content

        } catch (error) {
            lastError = error

            // Only retry on network / rate-limit errors, not on bad prompts etc.
            const isRetryable = error.message?.includes('rate') ||
                error.message?.includes('429') ||
                error.name === 'TypeError' // fetch network failure

            if (isRetryable && attempt < maxRetries) {
                const waitMs = 5000 * Math.pow(2, attempt)
                console.warn(`Groq request failed (${error.message}). Retrying in ${waitMs / 1000}s...`)
                await delay(waitMs)
                continue
            }
        }
    }

    console.error("Groq API Error after retries:", lastError)
    throw lastError
}

export async function groqChatWithContext(contextText, messages) {
    const systemPrompt = {
        role: 'system',
        content: `You are a helpful AI study assistant. Answer questions based on the following document context.
ALWAYS format your response with bullet points, numbered lists, and distinct paragraphs for easy reading. 
Use **bold** for key terms. Avoid long unbroken walls of text. Be point-wise and structured.

CONTEXT:
${contextText.slice(0, 8000)}`
    };
    return await groqChat({
        messages: [systemPrompt, ...messages],
        temperature: 0.5
    });
}