import OpenAI from 'openai';

export function createLLMService() {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const model = process.env.OPENROUTER_MODEL!;
  const api_key = process.env.OPENROUTER_API_KEY;

  return {
    async chat(message: string): Promise<string> {
      console.log('[User]', message);
      try {
        const response = await client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: 'Responde de forma directa y concisa. Sin emojis, sin asteriscos, sin markdown. Texto plano solamente. No uses listas con guiones ni numeración salvo que sea estrictamente necesario. Ve al punto, sin saludos ni despedidas.' },
            { role: 'user', content: message },
          ],
        });

        const text = response.choices[0]?.message?.content || 'No response';
        console.log('[Bot]', text);
        return text
      } catch (error) {
        console.error('[OpenRouter] Error:', error);
        throw error;
      }
    },
  };
}
