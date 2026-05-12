import 'reflect-metadata';
import dataSource from '../../config/datasource';
import * as bcrypt from 'bcrypt';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Client, ClientStatus } from '../entities/client.entity';
import { Contact, ContactRole } from '../entities/contact.entity';
import { Product } from '../entities/product.entity';
import { Plan } from '../entities/plan.entity';
import { PricingTier, PricingModelType } from '../entities/pricing-tier.entity';
import { Subscription, BillingCycle, SubscriptionStatus } from '../entities/subscription.entity';
import {
  ComplianceTemplate,
  ComplianceType,
  ComplianceFrequency,
} from '../entities/compliance-template.entity';
import { ComplianceItem, ComplianceItemStatus } from '../entities/compliance-item.entity';
import { Role } from '../../common/enums/role.enum';
import { nextRenewal, periodEnd, today, addDays } from '../../common/util/date-util';

async function main() {
  await dataSource.initialize();

  await dataSource.transaction(async (mgr) => {
    const orgs = mgr.getRepository(Organization);
    const users = mgr.getRepository(User);
    const clients = mgr.getRepository(Client);
    const contacts = mgr.getRepository(Contact);
    const products = mgr.getRepository(Product);
    const plans = mgr.getRepository(Plan);
    const tiers = mgr.getRepository(PricingTier);
    const subs = mgr.getRepository(Subscription);
    const tpls = mgr.getRepository(ComplianceTemplate);
    const items = mgr.getRepository(ComplianceItem);

    let org = await orgs.findOne({ where: { legalName: 'Dranzo Demo Org' } });
    if (!org) {
      org = orgs.create({
        legalName: 'Dranzo Demo Org',
        displayName: 'Dranzo Demo',
        country: 'IN',
        defaultCurrency: 'INR',
        invoicePrefix: 'DRZ',
        timezone: 'Asia/Kolkata',
        homeStateCode: 'KA',
        defaultReminderLeadDays: 7,
      });
      await orgs.save(org);
      console.log(`Seeded organization ${org.id}`);
    } else if (!org.homeStateCode) {
      org.homeStateCode = 'KA';
      org.defaultReminderLeadDays = org.defaultReminderLeadDays ?? 7;
      await orgs.save(org);
    }

    let admin = await users.findOne({ where: { email: 'admin@dranzo.test' } });
    if (!admin) {
      admin = users.create({
        organizationId: org.id,
        email: 'admin@dranzo.test',
        name: 'Demo Admin',
        passwordHash: await bcrypt.hash('Admin@123', 12),
        role: Role.ADMIN,
        isActive: true,
      });
      await users.save(admin);
      console.log('Seeded admin admin@dranzo.test / Admin@123');
    }

    // ----- Product / Plan / Tier -----
    let product = await products.findOne({ where: { organizationId: org.id, name: 'Cloud CRM' } });
    if (!product) {
      product = products.create({
        organizationId: org.id,
        name: 'Cloud CRM',
        sku: 'CRM-001',
        category: 'SaaS',
        description: 'Customer Relationship Management platform',
        isActive: true,
      });
      await products.save(product);
    }

    let plan = await plans.findOne({ where: { organizationId: org.id, name: 'CRM Pro' } });
    if (!plan) {
      plan = plans.create({
        organizationId: org.id,
        productId: product.id,
        name: 'CRM Pro',
        description: 'Per-user monthly subscription',
        isActive: true,
      });
      await plans.save(plan);
    }

    let tier = await tiers.findOne({ where: { organizationId: org.id, name: 'CRM Pro / user / month' } });
    if (!tier) {
      tier = tiers.create({
        organizationId: org.id,
        planId: plan.id,
        name: 'CRM Pro / user / month',
        modelType: PricingModelType.PER_USER_MONTH,
        currency: 'INR',
        baseAmount: 0,
        perUnitAmount: 50000, // ₹500.00 per user/month (paise)
        taxRate: '18.00',
        isActive: true,
        minUnits: 1,
      });
      await tiers.save(tier);
    }

    // ----- Client + Contact -----
    let client = await clients.findOne({
      where: { organizationId: org.id, legalName: 'Acme Industries Pvt Ltd' },
    });
    if (!client) {
      client = clients.create({
        organizationId: org.id,
        legalName: 'Acme Industries Pvt Ltd',
        displayName: 'Acme',
        country: 'IN',
        currency: 'INR',
        taxId: '29ABCDE1234F1Z5',
        placeOfSupply: 'KA',
        status: ClientStatus.ACTIVE,
        accountManagerId: admin.id,
        notes: 'Demo client created by seed',
      });
      await clients.save(client);

      await contacts.save(
        contacts.create({
          organizationId: org.id,
          clientId: client.id,
          name: 'Anita Rao',
          role: ContactRole.POC,
          email: 'anita@acme.test',
          phone: '+91-9999911111',
          isPrimary: true,
        }),
      );
      await contacts.save(
        contacts.create({
          organizationId: org.id,
          clientId: client.id,
          name: 'Ravi Kumar',
          role: ContactRole.BILLING,
          email: 'billing@acme.test',
          isPrimary: false,
        }),
      );
    }

    // ----- Subscription (renewal in 5 days so scheduler fires reminder immediately) -----
    let sub = await subs.findOne({ where: { organizationId: org.id, clientId: client.id } });
    if (!sub) {
      const start = addDays(today(), -25);
      const end = periodEnd(start, BillingCycle.MONTHLY);
      const renewal = nextRenewal(start, BillingCycle.MONTHLY);
      sub = subs.create({
        organizationId: org.id,
        clientId: client.id,
        planId: plan.id,
        pricingTierId: tier.id,
        billingCycle: BillingCycle.MONTHLY,
        startDate: start,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        nextRenewalDate: renewal,
        unitCount: 15,
        currency: 'INR',
        reminderLeadDays: 7,
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
      });
      await subs.save(sub);
      console.log(`Seeded subscription ${sub.id} renewal=${renewal}`);
    }

    // ----- Compliance templates + one item due in 5 days -----
    const tplDefs: Array<Partial<ComplianceTemplate>> = [
      { title: 'GSTR-1 monthly filing', type: ComplianceType.TAX_FILING, frequency: ComplianceFrequency.MONTHLY, dayOfMonth: 11 },
      { title: 'GSTR-3B monthly filing', type: ComplianceType.TAX_FILING, frequency: ComplianceFrequency.MONTHLY, dayOfMonth: 20 },
      { title: 'TDS payment', type: ComplianceType.TAX_FILING, frequency: ComplianceFrequency.MONTHLY, dayOfMonth: 7 },
      { title: 'Annual ROC filing', type: ComplianceType.AUDIT, frequency: ComplianceFrequency.YEARLY, dayOfMonth: 30, monthOfYear: 9 },
    ];
    for (const def of tplDefs) {
      const existing = await tpls.findOne({ where: { organizationId: org.id, title: def.title } });
      if (!existing) {
        await tpls.save(tpls.create({ organizationId: org.id, isActive: true, ...def } as ComplianceTemplate));
      }
    }

    const existingItem = await items.findOne({
      where: { organizationId: org.id, title: 'GSTR-3B for current month' },
    });
    if (!existingItem) {
      await items.save(
        items.create({
          organizationId: org.id,
          title: 'GSTR-3B for current month',
          type: ComplianceType.TAX_FILING,
          frequency: ComplianceFrequency.MONTHLY,
          nextDueDate: addDays(today(), 5),
          reminderLeadDays: 7,
          ownerId: admin.id,
          status: ComplianceItemStatus.ACTIVE,
        }),
      );
    }
  });

  await dataSource.destroy();
  console.log('Seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
