import { groqChat } from './groqClient'

export async function summarizeText(text) {
    const trimmed = text?.trim()
    if (!trimmed) throw new Error('No text extracted from PDF.')

    // Reduced from 12000 to 4000 chars to stay within Groq's free-tier TPM limit
    const chunk = trimmed.slice(0, 4000)

    return await groqChat({
        max_tokens: 768,
        temperature: 0.5,
        maxRetries: 3,
        messages: [
            { role: 'user', content: `Summarize this study material clearly and concisely. Use **bold** for key terms and bullet points for lists.\n\nMATERIAL:\n${chunk}` }
        ]
    })
}