import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    const ip = req.ip;

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.audit.record({
            organizationId: user?.organizationId,
            actorId: user?.userId ?? null,
            action: meta.action,
            entity: meta.entity,
            entityId: this.resolveEntityId(result, req),
            before: null,
            after: this.scrubAfter(result),
            ip,
          });
        } catch (e) {
          this.logger.warn(`audit write failed: ${(e as Error).message}`);
        }
      }),
    );
  }

  private resolveEntityId(result: unknown, req: any): string | null {
    if (result && typeof result === 'object' && 'id' in (result as object)) {
      return (result as { id: string }).id;
    }
    return req.params?.id ?? null;
  }

  private scrubAfter(result: unknown): unknown {
    if (!result || typeof result !== 'object') return result;
    const clone: Record<string, unknown> = { ...(result as object) };
    for (const k of Object.keys(clone)) {
      if (/password|secret|token|hash/i.test(k)) clone[k] = '[redacted]';
    }
    return clone;
  }
}
