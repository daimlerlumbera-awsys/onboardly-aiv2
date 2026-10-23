import 'dotenv/config'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './index'
import path from 'path'

async function main() {
  console.log('[migrate] running migrations…')
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../../drizzle'),
  })
  console.log('[migrate] done')
  await pool.end()
}

main().catch((err) => {
  console.error('[migrate] error:', err)
  process.exit(1)
})
