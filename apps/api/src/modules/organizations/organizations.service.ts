import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../database/entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  async findById(id: string): Promise<Organization> {
    const org = await this.repo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
