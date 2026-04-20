import { groqChat } from './groqClient'

export async function summarizeText(text) {
    const trimmed = text?.trim()
    if (!trimmed) throw new Error('No text extracted from PDF.')

    const chunk = trimmed.slice(0, 12000)

    return await groqChat({
        max_tokens: 1024,
        temperature: 0.5,
        messages: [
            { role: 'user', content: `Summarize this study material clearly. Use **bold** for key terms and bullet points for lists.\n\nMATERIAL:\n${chunk}` }
        ]
    })
}