import { defineConfig } from 'drizzle-kit';

const host = process.env.DB_HOST ?? '';
const isLocal = host === 'localhost' || host === '127.0.0.1';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host,
    port: Number(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    ssl: isLocal ? false : { rejectUnauthorized: false },
  },
});
