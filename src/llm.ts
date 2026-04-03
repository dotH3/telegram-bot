import OpenAI from 'openai';
import { getLastMessages, addCost } from './db.ts';

export function createLLMService() {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const model = process.env.OPENROUTER_MODEL!;

  return {
    async chat(message: string, withHistory: boolean = false): Promise<string> {
      console.log('[User]', message);
      try {
        const history = withHistory
          ? getLastMessages(6).map((m) => ({ role: m.role, content: m.content }))
          : [];

        const response = await client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: 'Eres un asistente conversacional. Responde de forma natural y directa, como en una conversación normal. Sin emojis, sin asteriscos, sin markdown. Texto plano solamente.' },
            ...history,
            { role: 'user', content: message },
          ],
        });

        const text = response.choices[0]?.message?.content || 'No response';
        console.log('[Bot]', text);

        const cost = (response as any).usage?.cost;
        if (typeof cost === 'number') addCost(cost);

        return text;
      } catch (error) {
        console.error('[OpenRouter] Error:', error);
        throw error;
      }
    },
  };
}
