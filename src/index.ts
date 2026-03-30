import 'dotenv/config';
import Fastify from 'fastify';
import { createBot } from './bot.ts';
import { createLLMService } from './llm.ts';

const bot = createBot();
const llm = createLLMService();

llm.chat('Hola, estoy despierto?').then((res) => console.log('[OpenRouter Test]', res));

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || !text.startsWith('/')) {
    try {
      const response = await llm.chat(text as string);
      await bot.sendMessage(chatId, response);
    } catch (error) {
      console.error('LLM Error:', error);
      await bot.sendMessage(chatId, 'Sorry, something went wrong.');
    }
  }
});

const fastify = Fastify({ logger: true });

fastify.post(`/bot${process.env.TELEGRAM_TOKEN}`, async (request, reply) => {
  const body = request.body as any;
  if (body?.update_id) {
    bot.processUpdate(body);
  }
  reply.send({ ok: true });
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    console.log(`Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
