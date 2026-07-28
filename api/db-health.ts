import { Client } from "pg";

declare global {
  // Vercel reuses warm function instances, so keep one pooler connection alive.
  // eslint-disable-next-line no-var
  var ksTvDbClient: Client | undefined;
}

async function getDbClient() {
  if (globalThis.ksTvDbClient) return globalThis.ksTvDbClient;

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is not configured");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  globalThis.ksTvDbClient = client;
  return client;
}

export default async function handler(
  _request: { method?: string },
  response: { status: (code: number) => { json: (body: unknown) => void } },
) {
  try {
    const db = await getDbClient();
    const result = await db.query("select count(*)::int as users from public.users");
    response.status(200).json({ ok: true, database: "supabase", users: result.rows[0]?.users ?? 0 });
  } catch (error) {
    globalThis.ksTvDbClient = undefined;
    response.status(503).json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" });
  }
}
