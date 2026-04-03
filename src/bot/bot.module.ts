import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { LlmModule } from '../llm/llm.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [LlmModule, MessagesModule],
  controllers: [BotController],
  providers: [BotService],
})
export class BotModule {}