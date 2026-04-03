import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bot: any;

  constructor(
    private configService: ConfigService,
    private llmService: LlmService,
    private messagesService: MessagesService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_TOKEN');
    this.logger.log(`Initializing bot with token: ${token ? '✓' : '✗'}`);
    this.bot = new TelegramBot(token);

    this.bot.on('message', (msg: any) => {
      this.handleMessage(msg);
    });

    this.bot.on('polling_error', (err: any) => {
      this.logger.error('Polling error:', err.message);
    });
  }

  async onModuleInit() {
    this.logger.log('Starting polling...');
    this.bot.startPolling();
    this.logger.log('Testing OpenRouter connection...');
    const { response } = await this.llmService.chat('Hola, responde solo "ok" si me escuchas.', []);
    this.logger.log(`OpenRouter response: ${response}`);
  }

  async handleMessage(msg: any): Promise<void> {
    const text = msg.text;
    if (!text) return;

    if (msg.entities?.some((e: any) => e.type === 'bot_command')) return;

    this.logger.log(`Received: ${text}`);

    const chatId = msg.chat.id;

    await this.messagesService.saveMessage('user', text);

    const history = await this.messagesService.getLastMessages(6);
    const historyFormatted = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { response } = await this.llmService.chat(text, historyFormatted);

    await this.messagesService.saveMessage('assistant', response);

    await this.bot.sendMessage(chatId, response);
  }
}
