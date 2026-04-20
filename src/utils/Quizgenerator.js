import { groqChat } from './groqClient'

export async function generateQuiz(text) {
    const trimmed = text?.trim()
    if (!trimmed) throw new Error('No text extracted from PDF.')

    const chunk = trimmed.slice(0, 12000)

    const raw = await groqChat({
        max_tokens: 2048,
        temperature: 0.3,
        messages: [
            { role: 'user', content: `Generate exactly 10 MCQ questions from this material. Respond with ONLY a JSON array, no markdown:\n[{"question":"...","options":["A","B","C","D"],"answer":0}]\n\nMATERIAL:\n${chunk}` }
        ]
    })

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const questions = JSON.parse(cleaned)
    return questions.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === 'number')
}