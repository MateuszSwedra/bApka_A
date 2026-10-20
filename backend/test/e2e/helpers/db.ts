import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required for live e2e');
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

/** Czyści wszystkie tabele domenowe (kolejność FK + CASCADE). */
export async function resetDatabase(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        "DoseLog",
        "MoodLog",
        "SosLog",
        "HealthMetricLog",
        "Schedule",
        "Inventory",
        "Connection",
        "User"
      RESTART IDENTITY CASCADE;
    `);
  } finally {
    client.release();
  }
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
