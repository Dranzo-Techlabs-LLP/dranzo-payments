import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../../database/entities/client.entity';
import { Contact } from '../../database/entities/contact.entity';
import { Tag } from '../../database/entities/tag.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { TagsController } from './tags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Contact, Tag])],
  controllers: [ClientsController, TagsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
