import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class InvoiceNumberService {
  /** MUST be called inside a transaction. Uses SELECT … FOR UPDATE for gap-free seq. */
  async nextNumber(
    mgr: EntityManager,
    organizationId: string,
    prefix: string,
    fyCode: string,
  ): Promise<{ invoiceNo: string; seq: number; fyCode: string }> {
    await mgr.query(
      `INSERT IGNORE INTO invoice_sequences (organization_id, fy_code, last_seq) VALUES (?, ?, 0)`,
      [organizationId, fyCode],
    );

    const rows = await mgr.query(
      `SELECT last_seq FROM invoice_sequences WHERE organization_id = ? AND fy_code = ? FOR UPDATE`,
      [organizationId, fyCode],
    );
    const current = rows?.[0]?.last_seq ?? 0;
    const next = Number(current) + 1;

    await mgr.query(
      `UPDATE invoice_sequences SET last_seq = ? WHERE organization_id = ? AND fy_code = ?`,
      [next, organizationId, fyCode],
    );

    const padded = String(next).padStart(4, '0');
    return { invoiceNo: `${prefix}-${fyCode}-${padded}`, seq: next, fyCode };
  }
}
