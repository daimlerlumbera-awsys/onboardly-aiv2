import dotenv from 'dotenv'
import { resolve } from 'path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Load .env from the apps/server root regardless of cwd
dotenv.config({ path: resolve(import.meta.dirname, '../../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
export { pool }
