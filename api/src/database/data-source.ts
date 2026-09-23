import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { entities } from './entities';

config({ path: ['.env.local', '.env'] });

const databasePort = Number(process.env.DATABASE_PORT ?? 5432);

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: databasePort,
  username: process.env.DATABASE_USER ?? 'coac_heroes',
  password: process.env.DATABASE_PASSWORD ?? 'coac_heroes',
  database: process.env.DATABASE_NAME ?? 'coac_heroes',
  entities,
  uuidExtension: 'pgcrypto',
  installExtensions: false,
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
});
