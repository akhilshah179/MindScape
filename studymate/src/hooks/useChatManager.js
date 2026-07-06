import { useState, useEffect } from 'react'

export function useChatManager(subjectName) {
    const [messages, setMessages] = useState([]);

    // Load history on mount
    useEffect(() => {
        const history = JSON.parse(localStorage.getItem(`chat_${subjectName}`)) || [];
        setMessages(history);
    }, [subjectName]);

    const sendMessage = async (newText, groqClient) => {
        const newMessage = { role: 'user', content: newText };
        const updatedMessages = [...messages, newMessage];

        setMessages(updatedMessages);

        // LIMIT HISTORY: Only send the system prompt + last 5 messages to the LLM
        const systemPrompt = { role: 'system', content: `You are an expert tutor in ${subjectName}.` };
        const contextToSend = [systemPrompt, ...updatedMessages.slice(-5)];

        const responseText = await groqClient.generate(contextToSend);

        const botReply = { role: 'assistant', content: responseText };
        const finalMessages = [...updatedMessages, botReply];

        setMessages(finalMessages);
        localStorage.setItem(`chat_${subjectName}`, JSON.stringify(finalMessages));
    };

    return { messages, sendMessage };
}