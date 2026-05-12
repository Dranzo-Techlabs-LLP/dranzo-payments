import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSlice1_1715500000000 implements MigrationInterface {
  name = 'InitSlice1_1715500000000';

  public async up(qr: QueryRunner): Promise<void> {
    // organizations
    await qr.query(`
      CREATE TABLE \`organizations\` (
        \`id\` varchar(36) NOT NULL,
        \`legal_name\` varchar(255) NOT NULL,
        \`display_name\` varchar(255) NOT NULL,
        \`country\` varchar(2) NOT NULL DEFAULT 'IN',
        \`default_currency\` char(3) NOT NULL DEFAULT 'INR',
        \`tax_id\` varchar(32) NULL,
        \`invoice_prefix\` varchar(16) NOT NULL DEFAULT 'INV',
        \`logo_url\` varchar(1024) NULL,
        \`address\` json NULL,
        \`bank_details\` json NULL,
        \`signing_authority\` varchar(255) NULL,
        \`invoice_footer\` text NULL,
        \`timezone\` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_organizations_legal_name\` (\`legal_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // users
    await qr.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`role\` enum('ADMIN','FINANCE','ACCOUNT_MANAGER','VIEWER') NOT NULL DEFAULT 'VIEWER',
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`last_login_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_users_org_email\` (\`organization_id\`,\`email\`),
        INDEX \`ix_users_organization_id\` (\`organization_id\`),
        CONSTRAINT \`fk_users_organization\`
          FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // refresh_tokens
    await qr.query(`
      CREATE TABLE \`refresh_tokens\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`token_hash\` char(64) NOT NULL,
        \`expires_at\` datetime(6) NOT NULL,
        \`revoked_at\` datetime(6) NULL,
        \`user_agent\` varchar(64) NULL,
        \`ip\` varchar(64) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_refresh_tokens_user_id\` (\`user_id\`),
        INDEX \`ix_refresh_tokens_token_hash\` (\`token_hash\`),
        CONSTRAINT \`fk_refresh_tokens_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // invitations
    await qr.query(`
      CREATE TABLE \`invitations\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`role\` enum('ADMIN','FINANCE','ACCOUNT_MANAGER','VIEWER') NOT NULL DEFAULT 'VIEWER',
        \`token_hash\` char(64) NOT NULL,
        \`expires_at\` datetime(6) NOT NULL,
        \`invited_by\` char(36) NOT NULL,
        \`accepted_at\` datetime(6) NULL,
        \`accepted_user_id\` char(36) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_invitations_org_email_open\` (\`organization_id\`,\`email\`),
        INDEX \`ix_invitations_organization_id\` (\`organization_id\`),
        INDEX \`ix_invitations_token_hash\` (\`token_hash\`),
        CONSTRAINT \`fk_invitations_organization\`
          FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // audit_logs
    await qr.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`actor_id\` char(36) NULL,
        \`action\` varchar(64) NOT NULL,
        \`entity\` varchar(64) NOT NULL,
        \`entity_id\` char(36) NULL,
        \`before\` json NULL,
        \`after\` json NULL,
        \`ip\` varchar(64) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_audit_org_created\` (\`organization_id\`,\`created_at\`),
        INDEX \`ix_audit_entity\` (\`entity\`,\`entity_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `audit_logs`;');
    await qr.query('DROP TABLE IF EXISTS `invitations`;');
    await qr.query('DROP TABLE IF EXISTS `refresh_tokens`;');
    await qr.query('DROP TABLE IF EXISTS `users`;');
    await qr.query('DROP TABLE IF EXISTS `organizations`;');
  }
}
