import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../database/entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async saveMessage(role: string, content: string): Promise<Message> {
    const message = this.messageRepository.create({ role, content });
    return this.messageRepository.save(message);
  }

  async getLastMessages(limit: number = 6): Promise<Message[]> {
    return this.messageRepository.find({
      order: { date: 'DESC' },
      take: limit,
    });
  }
}
