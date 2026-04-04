import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmCost } from '../database/entities/llm-cost.entity';

interface ChatMessage {
  role: string;
  content: string;
}

@Injectable()
export class LlmService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    @InjectRepository(LlmCost)
    private llmCostRepository: Repository<LlmCost>,
  ) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
    });
  }

  async chat(
    message: string,
    withHistory: ChatMessage[],
    replyContext?: string,
  ): Promise<{ response: string; cost: number }> {
    const model = this.configService.get<string>(
      'OPENROUTER_MODEL',
      'openai/gpt-3.5-turbo',
    );

    let systemPrompt =
      'Eres un asistente conversacional. Responde de forma natural y directa, como en una conversación normal. Sin emojis, sin asteriscos, sin markdown. Texto plano solamente.';
    
    // If this is a reply to another message, add context to the system prompt
    if (replyContext) {
      systemPrompt += `\n\nNota importante: El usuario está respondiendo específicamente al siguiente mensaje: "${replyContext}"`;
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...withHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
    });

    const response = completion.choices[0]?.message?.content ?? '';
    const cost = completion.usage
      ? (completion.usage.prompt_tokens + completion.usage.completion_tokens) *
        0.00001
      : 0;

    await this.saveCost(cost);

    return { response, cost };
  }

  async chatWithImage(
    imageBase64: string,
    message: string,
    withHistory: ChatMessage[],
    replyContext?: string,
  ): Promise<{ response: string; cost: number }> {
    const model = this.configService.get<string>(
      'OPENROUTER_MODEL',
      'openai/gpt-4o-mini',
    );

    let systemPrompt =
      'Eres un asistente conversacional. Respondes en español de forma natural y directa. Analiza la imagen proporcionada y responde accordingly. Sin emojis, sin asteriscos, sin markdown. Texto plano solamente.';
    
    // If this is a reply to another message, add context to the system prompt
    if (replyContext) {
      systemPrompt += `\n\nNota importante: El usuario está respondiendo específicamente al siguiente mensaje: "${replyContext}"`;
    }

    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...withHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: message || '¿Qué ves en esta imagen?' },
        ],
      },
    ];

    const completion = await this.openai.chat.completions.create({
      model,
      messages: messages as any,
    });

    const response = completion.choices[0]?.message?.content ?? '';
    const cost = completion.usage
      ? (completion.usage.prompt_tokens + completion.usage.completion_tokens) *
        0.00001
      : 0;

    await this.saveCost(cost);

    return { response, cost };
  }

  async chatWithAudio(
    audioBase64: string,
    mimeType: string,
    message: string,
    withHistory: ChatMessage[],
    replyContext?: string,
  ): Promise<{ response: string; cost: number }> {
    const model = this.configService.get<string>(
      'OPENROUTER_MODEL',
      'openai/gpt-4o-mini',
    );

    let systemPrompt =
      'Eres un asistente conversacional. Respondes en español de forma natural y directa. Escucha el audio proporcionado y responde al usuario. Sin emojis, sin asteriscos, sin markdown. Texto plano solamente.';
    
    // If this is a reply to another message, add context to the system prompt
    if (replyContext) {
      systemPrompt += `\n\nNota importante: El usuario está respondiendo específicamente al siguiente mensaje: "${replyContext}"`;
    }

    const audioPart = {
      type: 'input_audio',
      input_audio: {
        data: audioBase64,
        format: mimeType.includes('ogg') ? 'ogg' : 'mp3',
      },
    };

    const contentParts: any[] = [audioPart];
    if (message) {
      contentParts.push({ type: 'text', text: message });
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...withHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: contentParts,
      },
    ];

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
    });

    const response = completion.choices[0]?.message?.content ?? '';
    const cost = completion.usage
      ? (completion.usage.prompt_tokens + completion.usage.completion_tokens) *
        0.00001
      : 0;

    await this.saveCost(cost);

    return { response, cost };
  }

  private async saveCost(cost: number): Promise<void> {
    const existingCost = await this.llmCostRepository.findOne({
      where: { id: 1 },
    });
    if (existingCost) {
      existingCost.cost += cost;
      await this.llmCostRepository.save(existingCost);
    } else {
      await this.llmCostRepository.save({ cost });
    }
  }
}
