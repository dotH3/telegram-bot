import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}