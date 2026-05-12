import { MigrationInterface, QueryRunner } from 'typeorm';

export class Slice2to8_1715600000000 implements MigrationInterface {
  name = 'Slice2to8_1715600000000';

  public async up(qr: QueryRunner): Promise<void> {
    // --- Org-level fields needed downstream ---
    await qr.query(`
      ALTER TABLE \`organizations\`
        ADD COLUMN \`home_state_code\` varchar(8) NULL AFTER \`country\`,
        ADD COLUMN \`default_reminder_lead_days\` int NOT NULL DEFAULT 7 AFTER \`timezone\`;
    `);

    // --- Clients ---
    await qr.query(`
      CREATE TABLE \`clients\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`legal_name\` varchar(255) NOT NULL,
        \`display_name\` varchar(255) NOT NULL,
        \`industry\` varchar(64) NULL,
        \`country\` varchar(2) NOT NULL DEFAULT 'IN',
        \`currency\` char(3) NOT NULL DEFAULT 'INR',
        \`tax_id\` varchar(32) NULL,
        \`place_of_supply\` varchar(8) NULL,
        \`billing_address\` json NULL,
        \`shipping_address\` json NULL,
        \`status\` enum('ACTIVE','ON_HOLD','CHURNED') NOT NULL DEFAULT 'ACTIVE',
        \`account_manager_id\` char(36) NULL,
        \`notes\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_clients_organization_id\` (\`organization_id\`),
        INDEX \`ix_clients_status\` (\`organization_id\`,\`status\`),
        CONSTRAINT \`fk_clients_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_clients_account_manager\` FOREIGN KEY (\`account_manager_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Contacts ---
    await qr.query(`
      CREATE TABLE \`contacts\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`client_id\` char(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`role\` enum('POC','BILLING','TECHNICAL','DECISION_MAKER','OTHER') NOT NULL DEFAULT 'POC',
        \`email\` varchar(255) NULL,
        \`phone\` varchar(64) NULL,
        \`is_primary\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_contacts_client_id\` (\`client_id\`),
        CONSTRAINT \`fk_contacts_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Tags + join ---
    await qr.query(`
      CREATE TABLE \`tags\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`name\` varchar(64) NOT NULL,
        \`color\` varchar(16) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_tags_org_name\` (\`organization_id\`,\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    await qr.query(`
      CREATE TABLE \`client_tags\` (
        \`client_id\` char(36) NOT NULL,
        \`tag_id\` char(36) NOT NULL,
        PRIMARY KEY (\`client_id\`,\`tag_id\`),
        CONSTRAINT \`fk_ct_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_ct_tag\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Products + Plans + PricingTiers ---
    await qr.query(`
      CREATE TABLE \`products\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`sku\` varchar(64) NULL,
        \`category\` varchar(64) NULL,
        \`description\` text NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_products_org\` (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    await qr.query(`
      CREATE TABLE \`plans\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`product_id\` char(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_plans_org\` (\`organization_id\`),
        INDEX \`ix_plans_product\` (\`product_id\`),
        CONSTRAINT \`fk_plans_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    await qr.query(`
      CREATE TABLE \`pricing_tiers\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`plan_id\` char(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`model_type\` enum('FLAT_MONTH','FLAT_YEAR','PER_USER_MONTH','PER_USER_YEAR','TIERED_PER_USER','VOLUME_STEP','ONE_TIME') NOT NULL,
        \`currency\` char(3) NOT NULL DEFAULT 'INR',
        \`base_amount\` bigint NOT NULL DEFAULT 0,
        \`per_unit_amount\` bigint NOT NULL DEFAULT 0,
        \`tax_rate\` decimal(5,2) NOT NULL DEFAULT 18.00,
        \`tier_slabs\` json NULL,
        \`min_units\` int NULL,
        \`max_units\` int NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_tiers_org\` (\`organization_id\`),
        INDEX \`ix_tiers_plan\` (\`plan_id\`),
        CONSTRAINT \`fk_tiers_plan\` FOREIGN KEY (\`plan_id\`) REFERENCES \`plans\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Subscriptions ---
    await qr.query(`
      CREATE TABLE \`subscriptions\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`client_id\` char(36) NOT NULL,
        \`plan_id\` char(36) NOT NULL,
        \`pricing_tier_id\` char(36) NOT NULL,
        \`billing_cycle\` enum('MONTHLY','QUARTERLY','HALFYEARLY','YEARLY','CUSTOM') NOT NULL,
        \`start_date\` date NOT NULL,
        \`next_renewal_date\` date NOT NULL,
        \`current_period_start\` date NOT NULL,
        \`current_period_end\` date NOT NULL,
        \`unit_count\` int NOT NULL DEFAULT 1,
        \`custom_rate_override\` bigint NULL,
        \`currency\` char(3) NOT NULL DEFAULT 'INR',
        \`reminder_lead_days\` int NOT NULL DEFAULT 7,
        \`auto_renew\` tinyint(1) NOT NULL DEFAULT 1,
        \`status\` enum('TRIAL','ACTIVE','PAUSED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        \`notes\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_subs_org\` (\`organization_id\`),
        INDEX \`ix_subs_client\` (\`client_id\`),
        INDEX \`ix_subs_renewal\` (\`organization_id\`,\`next_renewal_date\`,\`status\`),
        CONSTRAINT \`fk_subs_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_subs_plan\` FOREIGN KEY (\`plan_id\`) REFERENCES \`plans\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_subs_tier\` FOREIGN KEY (\`pricing_tier_id\`) REFERENCES \`pricing_tiers\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    await qr.query(`
      CREATE TABLE \`subscription_events\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`subscription_id\` char(36) NOT NULL,
        \`event_type\` varchar(64) NOT NULL,
        \`payload\` json NULL,
        \`actor_id\` char(36) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_subevents_sub\` (\`subscription_id\`),
        CONSTRAINT \`fk_subevents_sub\` FOREIGN KEY (\`subscription_id\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Invoice sequence (gap-free per org per FY) ---
    await qr.query(`
      CREATE TABLE \`invoice_sequences\` (
        \`organization_id\` char(36) NOT NULL,
        \`fy_code\` varchar(8) NOT NULL,
        \`last_seq\` int NOT NULL DEFAULT 0,
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`organization_id\`,\`fy_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Invoices ---
    await qr.query(`
      CREATE TABLE \`invoices\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`client_id\` char(36) NOT NULL,
        \`subscription_id\` char(36) NULL,
        \`invoice_no\` varchar(32) NOT NULL,
        \`fy_code\` varchar(8) NOT NULL,
        \`seq\` int NOT NULL,
        \`issue_date\` date NOT NULL,
        \`due_date\` date NOT NULL,
        \`period_start\` date NOT NULL,
        \`period_end\` date NOT NULL,
        \`currency\` char(3) NOT NULL DEFAULT 'INR',
        \`line_items\` json NOT NULL,
        \`subtotal\` bigint NOT NULL DEFAULT 0,
        \`tax\` bigint NOT NULL DEFAULT 0,
        \`total\` bigint NOT NULL DEFAULT 0,
        \`status\` enum('DRAFT','SENT','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT',
        \`pdf_url\` varchar(1024) NULL,
        \`notes\` text NULL,
        \`sent_at\` datetime(6) NULL,
        \`paid_at\` datetime(6) NULL,
        \`idempotency_key\` varchar(128) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_invoices_org_no\` (\`organization_id\`,\`invoice_no\`),
        UNIQUE KEY \`uq_invoices_idem\` (\`organization_id\`,\`idempotency_key\`),
        INDEX \`ix_invoices_client\` (\`client_id\`),
        INDEX \`ix_invoices_status\` (\`organization_id\`,\`status\`,\`due_date\`),
        CONSTRAINT \`fk_invoices_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_invoices_sub\` FOREIGN KEY (\`subscription_id\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Payments ---
    await qr.query(`
      CREATE TABLE \`payments\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`invoice_id\` char(36) NOT NULL,
        \`amount\` bigint NOT NULL,
        \`currency\` char(3) NOT NULL DEFAULT 'INR',
        \`method\` enum('BANK','UPI','CARD','CHEQUE','OTHER') NOT NULL,
        \`reference_no\` varchar(128) NULL,
        \`received_on\` date NOT NULL,
        \`notes\` text NULL,
        \`attachment_url\` varchar(1024) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_payments_invoice\` (\`invoice_id\`),
        CONSTRAINT \`fk_payments_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Tasks ---
    await qr.query(`
      CREATE TABLE \`tasks\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`client_id\` char(36) NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`status\` enum('BACKLOG','TODO','IN_PROGRESS','WAITING_ON_CLIENT','OVERDUE','DONE') NOT NULL DEFAULT 'TODO',
        \`priority\` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
        \`due_date\` date NULL,
        \`assignee_id\` char(36) NULL,
        \`linked_entity_type\` enum('SUBSCRIPTION','INVOICE','COMPLIANCE','MANUAL') NOT NULL DEFAULT 'MANUAL',
        \`linked_entity_id\` char(36) NULL,
        \`cycle_key\` varchar(64) NULL,
        \`auto_generated\` tinyint(1) NOT NULL DEFAULT 0,
        \`completed_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_tasks_idem\` (\`organization_id\`,\`linked_entity_type\`,\`linked_entity_id\`,\`cycle_key\`),
        INDEX \`ix_tasks_status\` (\`organization_id\`,\`status\`,\`due_date\`),
        INDEX \`ix_tasks_assignee\` (\`assignee_id\`),
        CONSTRAINT \`fk_tasks_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_tasks_assignee\` FOREIGN KEY (\`assignee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // --- Compliance ---
    await qr.query(`
      CREATE TABLE \`compliance_templates\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`type\` enum('TAX_FILING','CONTRACT_REVIEW','KYC','LICENSE','SLA','AUDIT') NOT NULL,
        \`frequency\` enum('MONTHLY','QUARTERLY','HALFYEARLY','YEARLY','ONE_OFF') NOT NULL,
        \`day_of_month\` int NULL,
        \`month_of_year\` int NULL,
        \`jurisdiction\` varchar(64) NULL,
        \`description\` text NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_ctemplates_org\` (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    await qr.query(`
      CREATE TABLE \`compliance_items\` (
        \`id\` varchar(36) NOT NULL,
        \`organization_id\` char(36) NOT NULL,
        \`template_id\` char(36) NULL,
        \`client_id\` char(36) NULL,
        \`title\` varchar(255) NOT NULL,
        \`type\` enum('TAX_FILING','CONTRACT_REVIEW','KYC','LICENSE','SLA','AUDIT') NOT NULL,
        \`frequency\` enum('MONTHLY','QUARTERLY','HALFYEARLY','YEARLY','ONE_OFF') NOT NULL,
        \`next_due_date\` date NOT NULL,
        \`reminder_lead_days\` int NOT NULL DEFAULT 7,
        \`owner_id\` char(36) NULL,
        \`jurisdiction\` varchar(64) NULL,
        \`status\` enum('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
        \`notes\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        \`updated_by\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_citems_org\` (\`organization_id\`),
        INDEX \`ix_citems_due\` (\`organization_id\`,\`next_due_date\`,\`status\`),
        CONSTRAINT \`fk_citems_template\` FOREIGN KEY (\`template_id\`) REFERENCES \`compliance_templates\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_citems_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_citems_owner\` FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `compliance_items`;');
    await qr.query('DROP TABLE IF EXISTS `compliance_templates`;');
    await qr.query('DROP TABLE IF EXISTS `tasks`;');
    await qr.query('DROP TABLE IF EXISTS `payments`;');
    await qr.query('DROP TABLE IF EXISTS `invoices`;');
    await qr.query('DROP TABLE IF EXISTS `invoice_sequences`;');
    await qr.query('DROP TABLE IF EXISTS `subscription_events`;');
    await qr.query('DROP TABLE IF EXISTS `subscriptions`;');
    await qr.query('DROP TABLE IF EXISTS `pricing_tiers`;');
    await qr.query('DROP TABLE IF EXISTS `plans`;');
    await qr.query('DROP TABLE IF EXISTS `products`;');
    await qr.query('DROP TABLE IF EXISTS `client_tags`;');
    await qr.query('DROP TABLE IF EXISTS `tags`;');
    await qr.query('DROP TABLE IF EXISTS `contacts`;');
    await qr.query('DROP TABLE IF EXISTS `clients`;');
    await qr.query(`ALTER TABLE \`organizations\` DROP COLUMN \`home_state_code\`, DROP COLUMN \`default_reminder_lead_days\`;`);
  }
}
