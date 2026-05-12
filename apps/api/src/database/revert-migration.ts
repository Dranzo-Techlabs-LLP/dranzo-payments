import 'reflect-metadata';
import dataSource from '../config/datasource';

async function main() {
  await dataSource.initialize();
  await dataSource.undoLastMigration({ transaction: 'each' });
  // eslint-disable-next-line no-console
  console.log('reverted last migration');
  await dataSource.destroy();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
