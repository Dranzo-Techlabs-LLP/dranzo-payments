import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Client } from '../../database/entities/client.entity';
import { Contact, ContactRole } from '../../database/entities/contact.entity';
import { Tag } from '../../database/entities/tag.entity';
import { UpsertClientDto } from './dto/upsert-client.dto';
import { UpsertContactDto } from './dto/upsert-contact.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.clients.find({
      where: { organizationId },
      relations: { contacts: true, tags: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const c = await this.clients.findOne({
      where: { id, organizationId },
      relations: { contacts: true, tags: true },
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  async create(user: AuthenticatedUser, dto: UpsertClientDto, ip?: string) {
    const tags = dto.tagIds?.length
      ? await this.tags.find({ where: { id: In(dto.tagIds), organizationId: user.organizationId } })
      : [];
    const c = this.clients.create({
      organizationId: user.organizationId,
      legalName: dto.legalName,
      displayName: dto.displayName,
      industry: dto.industry,
      country: dto.country ?? 'IN',
      currency: dto.currency ?? 'INR',
      taxId: dto.taxId,
      placeOfSupply: dto.placeOfSupply,
      billingAddress: dto.billingAddress,
      shippingAddress: dto.shippingAddress,
      status: dto.status,
      accountManagerId: dto.accountManagerId,
      notes: dto.notes,
      tags,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.clients.save(c);

    if (dto.primaryContact?.name) {
      const pc = this.contacts.create({
        organizationId: user.organizationId,
        clientId: saved.id,
        name: dto.primaryContact.name,
        role: ContactRole.POC,
        email: dto.primaryContact.email,
        phone: dto.primaryContact.phone,
        isPrimary: true,
        createdBy: user.userId,
        updatedBy: user.userId,
      });
      await this.contacts.save(pc);
    }

    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'create_client',
      entity: 'Client',
      entityId: saved.id,
      after: { legalName: saved.legalName, status: saved.status },
      ip,
    });
    return saved;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertClientDto, ip?: string) {
    const c = await this.findOne(user.organizationId, id);
    const before = { ...c };
    Object.assign(c, {
      legalName: dto.legalName,
      displayName: dto.displayName,
      industry: dto.industry,
      country: dto.country ?? c.country,
      currency: dto.currency ?? c.currency,
      taxId: dto.taxId,
      placeOfSupply: dto.placeOfSupply,
      billingAddress: dto.billingAddress ?? c.billingAddress,
      shippingAddress: dto.shippingAddress ?? c.shippingAddress,
      status: dto.status ?? c.status,
      accountManagerId: dto.accountManagerId,
      notes: dto.notes,
      updatedBy: user.userId,
    });
    if (dto.tagIds) {
      c.tags = await this.tags.find({
        where: { id: In(dto.tagIds), organizationId: user.organizationId },
      });
    }
    const saved = await this.clients.save(c);

    if (dto.primaryContact?.name) {
      const existing = await this.contacts.findOne({
        where: { clientId: saved.id, isPrimary: true, organizationId: user.organizationId },
      });
      if (existing) {
        existing.name = dto.primaryContact.name;
        existing.email = dto.primaryContact.email ?? null;
        existing.phone = dto.primaryContact.phone ?? null;
        existing.role = ContactRole.POC;
        existing.updatedBy = user.userId;
        await this.contacts.save(existing);
      } else {
        const pc = this.contacts.create({
          organizationId: user.organizationId,
          clientId: saved.id,
          name: dto.primaryContact.name,
          role: ContactRole.POC,
          email: dto.primaryContact.email,
          phone: dto.primaryContact.phone,
          isPrimary: true,
          createdBy: user.userId,
          updatedBy: user.userId,
        });
        await this.contacts.save(pc);
      }
    }

    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'update_client',
      entity: 'Client',
      entityId: c.id,
      before,
      after: saved,
      ip,
    });
    return saved;
  }

  async remove(user: AuthenticatedUser, id: string, ip?: string) {
    const c = await this.findOne(user.organizationId, id);
    await this.clients.softRemove(c);
    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'delete_client',
      entity: 'Client',
      entityId: id,
      ip,
    });
  }

  async addContact(user: AuthenticatedUser, clientId: string, dto: UpsertContactDto, ip?: string) {
    const client = await this.findOne(user.organizationId, clientId);
    const c = this.contacts.create({
      organizationId: user.organizationId,
      clientId: client.id,
      name: dto.name,
      role: dto.role,
      email: dto.email,
      phone: dto.phone,
      isPrimary: dto.isPrimary ?? false,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.contacts.save(c);
    if (saved.isPrimary) {
      await this.contacts
        .createQueryBuilder()
        .update(Contact)
        .set({ isPrimary: false })
        .where('client_id = :cid AND id != :id', { cid: client.id, id: saved.id })
        .execute();
    }
    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'add_contact',
      entity: 'Contact',
      entityId: saved.id,
      after: { name: saved.name, role: saved.role },
      ip,
    });
    return saved;
  }

  async updateContact(user: AuthenticatedUser, contactId: string, dto: UpsertContactDto, ip?: string) {
    const c = await this.contacts.findOne({
      where: { id: contactId, organizationId: user.organizationId },
    });
    if (!c) throw new NotFoundException();
    Object.assign(c, dto, { updatedBy: user.userId });
    const saved = await this.contacts.save(c);
    if (saved.isPrimary) {
      await this.contacts
        .createQueryBuilder()
        .update(Contact)
        .set({ isPrimary: false })
        .where('client_id = :cid AND id != :id', { cid: c.clientId, id: saved.id })
        .execute();
    }
    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'update_contact',
      entity: 'Contact',
      entityId: saved.id,
      after: saved,
      ip,
    });
    return saved;
  }

  async removeContact(user: AuthenticatedUser, contactId: string, ip?: string) {
    const c = await this.contacts.findOne({
      where: { id: contactId, organizationId: user.organizationId },
    });
    if (!c) throw new NotFoundException();
    await this.contacts.softRemove(c);
    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'delete_contact',
      entity: 'Contact',
      entityId: contactId,
      ip,
    });
  }
}
