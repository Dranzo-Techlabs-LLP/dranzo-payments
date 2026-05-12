import 'reflect-metadata';
import dataSource from '../config/datasource';

async function main() {
  await dataSource.initialize();
  const pending = await dataSource.showMigrations();
  // eslint-disable-next-line no-console
  console.log(`pending migrations: ${pending ? 'yes' : 'no'}`);
  const ran = await dataSource.runMigrations({ transaction: 'each' });
  // eslint-disable-next-line no-console
  console.log(`ran ${ran.length} migration(s):`);
  for (const m of ran) {
    // eslint-disable-next-line no-console
    console.log(` - ${m.name}`);
  }
  await dataSource.destroy();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
