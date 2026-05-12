import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return invoiceId
      ? this.svc.listForInvoice(user.organizationId, invoiceId)
      : this.svc.list(user.organizationId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
    @Ip() ip: string,
  ) {
    return this.svc.create(user, dto, ip);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FINANCE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.svc.remove(user, id, ip);
  }
}
