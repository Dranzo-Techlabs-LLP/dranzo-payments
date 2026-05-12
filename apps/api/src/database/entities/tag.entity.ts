import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'tags' })
@Unique('uq_tags_org_name', ['organizationId', 'name'])
export class Tag extends BaseEntity {
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  color?: string | null;
}
