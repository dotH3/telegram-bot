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
  ): Promise<{ response: string; cost: number }> {
    const model = this.configService.get<string>('OPENROUTER_MODEL', 'openai/gpt-3.5-turbo');

    const systemPrompt =
      'Eres un asistente conversacional. Responde de forma natural y directa, como en una conversación normal. Sin emojis, sin asteriscos, sin markdown. Texto plano solamente.';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...withHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
    });

    const response = completion.choices[0]?.message?.content ?? '';
    const cost = completion.usage
      ? (completion.usage.prompt_tokens + completion.usage.completion_tokens) * 0.00001
      : 0;

    const existingCost = await this.llmCostRepository.findOne({ where: { id: 1 } });
    if (existingCost) {
      existingCost.cost += cost;
      await this.llmCostRepository.save(existingCost);
    } else {
      await this.llmCostRepository.save({ cost });
    }

    return { response, cost };
  }
}