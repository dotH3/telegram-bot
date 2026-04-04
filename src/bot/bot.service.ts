import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { LlmService } from '../llm/llm.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);

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
    const { response } = await this.llmService.chat(
      'Hola, responde solo "ok" si me escuchas.',
      [],
    );
    this.logger.log(`OpenRouter response: ${response}`);
  }

  private getSenderInfo(msg: any): string {
    const from = msg.from;
    if (!from) return 'unknown';
    const parts = [`id=${from.id}`];
    if (from.username) parts.push(`@${from.username}`);
    if (from.first_name) parts.push(from.first_name);
    return parts.join(', ');
  }

  private isWhitelisted(msg: any): boolean {
    const whitelist = this.configService.get<string>('WHITELIST') || '';
    const allowedIds = whitelist.split(',').map((id) => id.trim());
    const userId = String(msg.from?.id);
    return allowedIds.includes(userId);
  }

  private extractReplyContext(msg: any): string | undefined {
    if (!msg.reply_to_message) {
      return undefined;
    }

    const replyMsg = msg.reply_to_message;
    
    // Extract text from the replied message
    if (replyMsg.text) {
      return replyMsg.text;
    }
    
    // Extract caption if it's a photo
    if (replyMsg.photo && replyMsg.caption) {
      return `[Imagen] ${replyMsg.caption}`;
    }
    
    // If it's a photo without caption
    if (replyMsg.photo) {
      return '[Imagen]';
    }
    
    // If it's a voice or audio message
    if (replyMsg.voice || replyMsg.audio) {
      return '[Audio]';
    }
    
    return undefined;
  }

  async handleMessage(msg: any): Promise<void> {
    const chatId = msg.chat.id;
    const senderInfo = this.getSenderInfo(msg);

    if (!this.isWhitelisted(msg)) {
      this.logger.warn(
        `Blocked message from [${senderInfo}]: not in whitelist`,
      );
      await this.bot.sendMessage(chatId, 'x');
      return;
    }

    if (msg.photo && msg.photo.length > 0) {
      await this.handlePhoto(msg);
      return;
    }

    if (msg.voice || msg.audio) {
      await this.handleAudio(msg);
      return;
    }

    const text = msg.text;
    if (!text) return;

    if (msg.entities?.some((e: any) => e.type === 'bot_command')) return;

    this.logger.log(`Received text from [${senderInfo}]: ${text}`);

    await this.messagesService.saveMessage('user', text);

    const history = await this.messagesService.getLastMessages(10);
    const historyFormatted = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Extract reply context if this message is a reply
    const replyContext = this.extractReplyContext(msg);

    const { response } = await this.llmService.chat(text, historyFormatted, replyContext);

    await this.messagesService.saveMessage('assistant', response);

    await this.bot.sendMessage(chatId, response);
  }

  private async handlePhoto(msg: any): Promise<void> {
    const chatId = msg.chat.id;
    const photo = msg.photo[msg.photo.length - 1];

    this.logger.log(
      `Received photo from [${this.getSenderInfo(msg)}]: ${photo.file_id}`,
    );

    await this.bot.sendMessage(chatId, 'Procesando imagen...');

    try {
      const file = await this.bot.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      const history = await this.messagesService.getLastMessages(10);
      const historyFormatted = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const caption = msg.caption || '¿Qué ves en esta imagen?';
      await this.messagesService.saveMessage('user', `[Imagen] ${caption}`);

      // Extract reply context if this message is a reply
      const replyContext = this.extractReplyContext(msg);

      const { response: llmResponse } = await this.llmService.chatWithImage(
        base64,
        caption,
        historyFormatted,
        replyContext,
      );

      await this.messagesService.saveMessage('assistant', llmResponse);
      await this.bot.sendMessage(chatId, llmResponse);
    } catch (error) {
      this.logger.error('Error processing photo:', error);
      await this.bot.sendMessage(chatId, 'Error al procesar la imagen.');
    }
  }

  private async handleAudio(msg: any): Promise<void> {
    const chatId = msg.chat.id;
    const fileId = msg.voice?.file_id || msg.audio?.file_id;
    const mimeType =
      msg.voice?.mime_type || msg.audio?.mime_type || 'audio/ogg';

    this.logger.log(
      `Received audio from [${this.getSenderInfo(msg)}]: ${fileId}`,
    );

    await this.bot.sendMessage(chatId, 'Procesando audio...');

    try {
      const file = await this.bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      await this.messagesService.saveMessage('user', '[Audio]');

      const history = await this.messagesService.getLastMessages(10);
      const historyFormatted = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Extract reply context if this message is a reply
      const replyContext = this.extractReplyContext(msg);

      const { response: llmResponse } = await this.llmService.chatWithAudio(
        base64,
        mimeType,
        '',
        historyFormatted,
        replyContext,
      );

      await this.messagesService.saveMessage('assistant', llmResponse);
      await this.bot.sendMessage(chatId, llmResponse);
    } catch (error) {
      this.logger.error('Error processing audio:', error);
      await this.bot.sendMessage(chatId, 'Error al procesar el audio.');
    }
  }
}
