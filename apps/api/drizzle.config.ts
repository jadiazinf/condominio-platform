import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: '../../packages/database/src/drizzle/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
