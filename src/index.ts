import 'dotenv/config';
import Fastify from 'fastify';
import { createBot } from './bot.ts';
import { createLLMService } from './llm.ts';
import { addMessage } from './db.ts';

const bot = createBot();
const llm = createLLMService();

llm.chat('Hola?')

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || !text.startsWith('/')) {
    try {
      addMessage('user', text!, msg.date);
      const response = await llm.chat(text as string);
      addMessage('assistant', response, Math.floor(Date.now() / 1000));
      await bot.sendMessage(chatId, response);
    } catch (error) {
      console.error('LLM Error:', error);
      await bot.sendMessage(chatId, 'Sorry, something went wrong.');
    }
  }
});

const fastify = Fastify({ logger: false });

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
