import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column({ type: 'char', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'datetime', precision: 6, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 6, name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'user_agent', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 64, name: 'ip', nullable: true })
  ip?: string | null;
}
