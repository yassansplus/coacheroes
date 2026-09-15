import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

const databasePort = Number(process.env.DATABASE_PORT ?? 5432);

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: databasePort,
  username: process.env.DATABASE_USER ?? 'coac_heroes',
  password: process.env.DATABASE_PASSWORD ?? 'coac_heroes',
  database: process.env.DATABASE_NAME ?? 'coac_heroes',
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
});
