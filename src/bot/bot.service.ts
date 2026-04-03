import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { LlmService } from '../llm/llm.service';
import { MessagesService } from '../messages/messages.service';

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
    entities?: Array<{ type: string }>;
  };
}

@Injectable()
export class BotService {
  private bot: TelegramBot;

  constructor(
    private configService: ConfigService,
    private llmService: LlmService,
    private messagesService: MessagesService,
  ) {
    this.bot = new TelegramBot(this.configService.get<string>('TELEGRAM_TOKEN'), {
      polling: false,
    });
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_TOKEN');
    if (!token) {
      throw new UnauthorizedException('TELEGRAM_TOKEN not configured');
    }

    const message = update.message;
    if (!message) return;

    const text = message.text;
    if (!text) return;

    if (message.entities?.some((e) => e.type === 'bot_command')) return;

    const chatId = message.chat.id;

    await this.messagesService.saveMessage('user', text);

    const history = await this.messagesService.getLastMessages(6);
    const historyFormatted = history.map((m) => ({ role: m.role, content: m.content }));

    const { response } = await this.llmService.chat(text, historyFormatted);

    await this.messagesService.saveMessage('assistant', response);

    await this.bot.sendMessage(chatId, response);
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    await this.bot.sendMessage(chatId, text);
  }
}