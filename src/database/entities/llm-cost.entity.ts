import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('llm_cost')
export class LlmCost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'real', default: 0 })
  cost: number;
}