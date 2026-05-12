import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../../database/entities/organization.entity';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
