import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-8b-8192';

/**
 * Common call helper to query Groq model
 */
const queryGroq = async (prompt, systemInstruction = 'You are an expert programming tutor and senior software architect.') => {
    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: GROQ_MODEL,
                temperature: 0.3,
                max_tokens: 2048,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data?.choices?.[0]?.message?.content || 'AI was unable to generate a response.';
    } catch (err) {
        console.error('Groq AI Code Service Error:', err.response?.data || err.message);
        throw new Error('AI service failed to analyze code.');
    }
};

/**
 * Generates an explanation for a code block.
 */
export const explainCode = async (code, language) => {
    const prompt = `Explain what this ${language} code does in detail, line by line, explaining the logic and structure. Keep it clear, concise, and educational.

CODE:
\`\`\`${language}
${code}
\`\`\``;

    return await queryGroq(prompt, `You are a friendly and clear computer science professor.`);
};

/**
 * Searches code for bugs and offers corrections.
 */
export const findBugs = async (code, language, error = '') => {
    let prompt = `Analyze this ${language} code for bugs, syntax errors, logical errors, or potential runtime issues.`;
    
    if (error) {
        prompt += ` The user reports the following compiler/runtime error: "${error}". Explain why this error occurs and how to fix it.`;
    }

    prompt += `\n\nCODE:\n\`\`\`${language}\n${code}\n\`\`\`\n\nStructure your response with:
1. **Problem**: Briefly describe the bugs or cause of the error.
2. **Reason**: Explain why the code fails.
3. **Fix**: Explain how to resolve the issue.
4. **Corrected Code**: Provide the corrected code inside a Markdown code block.`;

    return await queryGroq(prompt, `You are an expert compiler debugger.`);
};

/**
 * Analyzes code and suggests optimizations.
 */
export const suggestOptimizations = async (code, language) => {
    const prompt = `Analyze the performance of this ${language} code. Focus on:
1. **Complexity Analysis**: Evaluate the current Time Complexity and Space Complexity.
2. **Optimization Suggestions**: Describe how we can optimize this code (e.g. better algorithms, data structures, caching, or memory layout).
3. **Optimized Code**: Provide the fully optimized version of this code inside a Markdown code block.
4. **Explanation of Changes**: Summarize why the optimized code is more efficient.

CODE:
\`\`\`${language}
${code}
\`\`\``;

    return await queryGroq(prompt, `You are a senior software engineer specializing in performance tuning and algorithmic optimization.`);
};
