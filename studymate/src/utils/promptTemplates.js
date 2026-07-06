/**
 * Built-in prompt templates for StudyMate AI
 * Users can click these to quickly insert structured prompts
 */
export const PROMPT_CATEGORIES = [
    { id: 'learning', label: 'Learning', icon: '📖', color: 'violet' },
    { id: 'quiz', label: 'Quiz & Test', icon: '📝', color: 'emerald' },
    { id: 'summary', label: 'Summarize', icon: '📋', color: 'sky' },
    { id: 'explain', label: 'Explain', icon: '💡', color: 'amber' },
    { id: 'practice', label: 'Practice', icon: '🎯', color: 'rose' },
    { id: 'productivity', label: 'Productivity', icon: '⚡', color: 'indigo' },
]

export const PROMPT_TEMPLATES = [
    {
        id: 'explain_concept',
        category: 'explain',
        title: 'Explain a Concept',
        description: 'Get a clear explanation of any topic',
        template: 'Explain the concept of [topic] in simple terms. Use real-world analogies and examples to make it easy to understand. Break it down step by step.',
    },
    {
        id: 'explain_like_5',
        category: 'explain',
        title: 'Explain Like I\'m 5',
        description: 'Simplify complex topics',
        template: 'Explain [topic] as if I\'m a complete beginner with no background knowledge. Use very simple language and everyday examples.',
    },
    {
        id: 'compare_topics',
        category: 'explain',
        title: 'Compare & Contrast',
        description: 'Compare two concepts side by side',
        template: 'Compare and contrast [topic A] and [topic B]. Create a clear comparison covering: key differences, similarities, use cases, pros/cons, and when to use each one.',
    },
    {
        id: 'quiz_mcq',
        category: 'quiz',
        title: 'Multiple Choice Quiz',
        description: 'Generate MCQ questions on any topic',
        template: 'Generate 5 multiple-choice questions about [topic]. For each question, provide 4 options (A-D) and indicate the correct answer with a brief explanation.',
    },
    {
        id: 'quiz_truefalse',
        category: 'quiz',
        title: 'True or False Quiz',
        description: 'Quick true/false assessment',
        template: 'Create 8 True or False statements about [topic]. Mix in some tricky ones. Reveal the answers at the end with explanations.',
    },
    {
        id: 'quiz_fill_blanks',
        category: 'quiz',
        title: 'Fill in the Blanks',
        description: 'Test recall with fill-in questions',
        template: 'Create 6 fill-in-the-blank questions about [topic]. Provide the answers separately at the end.',
    },
    {
        id: 'summarize_topic',
        category: 'summary',
        title: 'Summarize a Topic',
        description: 'Get key points of any subject',
        template: 'Provide a comprehensive summary of [topic]. Include: key concepts, important facts, main takeaways, and common misconceptions. Use bullet points for clarity.',
    },
    {
        id: 'study_notes',
        category: 'summary',
        title: 'Create Study Notes',
        description: 'Structured notes for revision',
        template: 'Create detailed study notes for [topic] suitable for exam preparation. Include: definitions, key formulas/rules, examples, common exam questions, and memory aids/mnemonics.',
    },
    {
        id: 'flashcards',
        category: 'learning',
        title: 'Generate Flashcards',
        description: 'Create Q&A flashcard pairs',
        template: 'Create 10 flashcard-style question-answer pairs for [topic]. Each card should have a focused question on the front and a concise answer on the back. Cover the most important concepts.',
    },
    {
        id: 'mind_map',
        category: 'learning',
        title: 'Mind Map / Outline',
        description: 'Hierarchical topic breakdown',
        template: 'Create a detailed mind map or hierarchical outline for [topic]. Start from the main concept and branch out into subtopics, sub-subtopics, and key details. Use indentation to show hierarchy.',
    },
    {
        id: 'teach_back',
        category: 'learning',
        title: 'Teach Me Step by Step',
        description: 'Guided learning experience',
        template: 'Teach me [topic] from scratch in a step-by-step manner. Start with prerequisites, then build up to the main concept. Include exercises at each step to check understanding.',
    },
    {
        id: 'practice_problems',
        category: 'practice',
        title: 'Practice Problems',
        description: 'Generate practice exercises',
        template: 'Give me 5 practice problems on [topic], ordered from easy to hard. For each problem, provide hints if I get stuck and detailed solutions at the end.',
    },
    {
        id: 'exam_prep',
        category: 'practice',
        title: 'Exam Preparation',
        description: 'Targeted exam review',
        template: 'Help me prepare for an exam on [topic]. Cover: most likely questions, important formulas/concepts to memorize, common mistakes to avoid, and last-minute revision tips.',
    },
    {
        id: 'study_plan',
        category: 'productivity',
        title: 'Create Study Plan',
        description: 'Structured study schedule',
        template: 'Create a [timeframe]-long study plan for learning [topic/subject]. Break it down into daily/weekly goals with specific tasks, resources, and milestones. Include time for review and practice.',
    },
    {
        id: 'weakness_analysis',
        category: 'productivity',
        title: 'Analyze My Weaknesses',
        description: 'Identify knowledge gaps',
        template: 'I\'m studying [subject] and I find [specific area] difficult. Help me identify exactly what concepts I\'m missing, create a targeted plan to strengthen these areas, and suggest practice exercises.',
    },
]

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(categoryId) {
    return PROMPT_TEMPLATES.filter(t => t.category === categoryId)
}

/**
 * Get a template by ID
 */
export function getTemplateById(id) {
    return PROMPT_TEMPLATES.find(t => t.id === id)
}
