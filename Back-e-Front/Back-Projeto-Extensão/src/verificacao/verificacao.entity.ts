import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class PhoneVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  Usuario_id: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  telefone: string | null;

  @Column({ default: false })
  consumed: boolean;

  @Column({ type: 'datetime', nullable: true })
  consumed_at: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  consumed_jid: string | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date | null;
}
