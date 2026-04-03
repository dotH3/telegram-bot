import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { LlmCost } from './entities/llm-cost.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, LlmCost])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}