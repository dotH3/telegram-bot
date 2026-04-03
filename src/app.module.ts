import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { BotModule } from './bot/bot.module';
import { LlmModule } from './llm/llm.module';
import { MessagesModule } from './messages/messages.module';
import { Message } from './database/entities/message.entity';
import { LlmCost } from './database/entities/llm-cost.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [Message, LlmCost],
      synchronize: true,
    }),
    DatabaseModule,
    BotModule,
    LlmModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
