import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function run() {
  const connStr = `postgresql://postgres.ybyxdnarvgzlregzpmow:andrey7karpiuk@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to Supabase');

  try {
    const migrationPath = path.resolve('supabase/migrations/20260808110000_broadcast_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('✅ Broadcast migration applied!');

    const res = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'matches'
      AND column_name IN ('youtube_stream_key', 'youtube_rtmp_url', 'is_broadcasting', 'broadcast_room_id', 'broadcast_started_at')
      ORDER BY column_name;
    `);
    console.log('New broadcast columns:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
