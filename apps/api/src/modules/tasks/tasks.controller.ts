import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/upsert-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user.organizationId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto, @Ip() ip: string) {
    return this.svc.create(user, dto, ip);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Ip() ip: string,
  ) {
    return this.svc.update(user, id, dto, ip);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.remove(user, id, ip);
  }
}
