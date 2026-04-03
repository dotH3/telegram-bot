import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { LlmModule } from '../llm/llm.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [LlmModule, MessagesModule],
  providers: [BotService],
})
export class BotModule {}
