import OpenAI from 'openai';

export function createLLMService() {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  return {
    async chat(message: string): Promise<string> {
      console.log('[OpenRouter] Input:', message);
      const response = await client.chat.completions.create({
        model: 'minimax/minimax-01',
        messages: [{ role: 'user', content: message }],
      });
      console.log('[OpenRouter] Full response:', JSON.stringify(response, null, 2));
      console.log('[OpenRouter] Output:', response.choices[0]?.message?.content);

      return response.choices[0]?.message?.content || 'No response';
    },
  };
}
