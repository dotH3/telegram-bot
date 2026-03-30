import TelegramBot from 'node-telegram-bot-api';

export function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_TOKEN is not set');
  }

  return new TelegramBot(token, { polling: true });
}
