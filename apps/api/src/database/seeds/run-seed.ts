import 'reflect-metadata';
import dataSource from '../../config/datasource';
import * as bcrypt from 'bcrypt';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Role } from '../../common/enums/role.enum';

async function main() {
  await dataSource.initialize();

  await dataSource.transaction(async (mgr) => {
    const orgs = mgr.getRepository(Organization);
    const users = mgr.getRepository(User);

    let org = await orgs.findOne({ where: { legalName: 'Dranzo Demo Org' } });
    if (!org) {
      org = orgs.create({
        legalName: 'Dranzo Demo Org',
        displayName: 'Dranzo Demo',
        country: 'IN',
        defaultCurrency: 'INR',
        invoicePrefix: 'DRZ',
        timezone: 'Asia/Kolkata',
      });
      await orgs.save(org);
      // eslint-disable-next-line no-console
      console.log(`Seeded organization ${org.id}`);
    }

    const adminEmail = 'admin@dranzo.test';
    let admin = await users.findOne({ where: { email: adminEmail } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('Admin@123', 12);
      admin = users.create({
        organizationId: org.id,
        email: adminEmail,
        name: 'Demo Admin',
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      });
      await users.save(admin);
      // eslint-disable-next-line no-console
      console.log(`Seeded admin user ${adminEmail} / Admin@123`);
    } else {
      // eslint-disable-next-line no-console
      console.log('Admin user already exists, skipping');
    }
  });

  await dataSource.destroy();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
