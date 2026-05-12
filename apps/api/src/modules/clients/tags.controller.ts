import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, IsString, Length } from 'class-validator';
import { Tag } from '../../database/entities/tag.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

class UpsertTagDto {
  @IsString() @Length(1, 64) name!: string;
  @IsOptional() @IsString() @Length(1, 16) color?: string;
}

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tags')
export class TagsController {
  constructor(@InjectRepository(Tag) private readonly repo: Repository<Tag>) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.repo.find({ where: { organizationId: user.organizationId } });
  }

  @Post()
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertTagDto) {
    const t = this.repo.create({
      organizationId: user.organizationId,
      name: dto.name,
      color: dto.color,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    return this.repo.save(t);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const t = await this.repo.findOne({ where: { id, organizationId: user.organizationId } });
    if (t) await this.repo.softRemove(t);
  }
}
