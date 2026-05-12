import {
  Body,
  Controller,
  Get,
  Header,
  Ip,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

class GenerateInvoiceDto {
  @IsUUID() subscriptionId!: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsInt() @Min(0) dueOffsetDays?: number;
}

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user.organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.findOne(user.organizationId, id);
  }

  @Get(':id/html')
  @Header('content-type', 'text/html; charset=utf-8')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  async html(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.svc.renderHtml(user.organizationId, id);
    res.send(html);
  }

  @Post('generate')
  @Roles(Role.ADMIN, Role.FINANCE)
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateInvoiceDto,
    @Ip() _ip: string,
  ) {
    return this.svc.generateForSubscription(user.organizationId, dto.subscriptionId, {
      issueDate: dto.issueDate,
      dueOffsetDays: dto.dueOffsetDays ?? 7,
      actorId: user.userId,
    });
  }

  @Patch(':id/void')
  @Roles(Role.ADMIN, Role.FINANCE)
  voidIt(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.voidInvoice(user, id, ip);
  }
}
