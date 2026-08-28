import { groqChat } from './groqClient'

export async function generateQuiz(text) {
    const trimmed = text?.trim()
    if (!trimmed) throw new Error('No text extracted from PDF.')

    // Reduced from 12000 to 4000 chars to stay well within the 6000 TPM free-tier limit
    const chunk = trimmed.slice(0, 4000)

    const raw = await groqChat({
        max_tokens: 1024,
        temperature: 0.3,
        maxRetries: 3,
        messages: [
            { role: 'user', content: `Generate exactly 5 MCQ questions from this material. Respond with ONLY a JSON array, no markdown:\n[{"question":"...","options":["A","B","C","D"],"answer":0}]\n\nMATERIAL:\n${chunk}` }
        ]
    })

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const questions = JSON.parse(cleaned)
    return questions.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === 'number')
}