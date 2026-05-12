import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'datetime', precision: 6, name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6, name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({
    type: 'datetime',
    precision: 6,
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt?: Date | null;

  @Column({ type: 'char', length: 36, name: 'created_by', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'char', length: 36, name: 'updated_by', nullable: true })
  updatedBy?: string | null;
}
