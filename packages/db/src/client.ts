import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let dbInstance: any = null;
let pgliteInstance: PGlite | null = null;

function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let cur = startDir;
  while (cur) {
    if (fs.existsSync(path.join(cur, "pnpm-workspace.yaml"))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startDir;
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
    });
    dbInstance = drizzlePg(pool, { schema });
    return dbInstance;
  }

  // Fallback to in-memory or persisted PGlite for zero-setup local dev & tests
  if (!pgliteInstance) {
    if (process.env.TASKMATE_DATA_DIR === "memory://" || process.env.NODE_ENV === "test") {
      pgliteInstance = new PGlite();
    } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // In serverless environments (e.g. Vercel), the function root /var/task is read-only.
      // Use /tmp/taskmate_pglite which is writable.
      try {
        const tmpDir = process.env.TASKMATE_DATA_DIR || path.join(os.tmpdir(), "taskmate_pglite");
        fs.mkdirSync(tmpDir, { recursive: true });
        pgliteInstance = new PGlite(tmpDir);
      } catch {
        pgliteInstance = new PGlite();
      }
    } else {
      try {
        const root = findWorkspaceRoot();
        const dataDir = process.env.TASKMATE_DATA_DIR || path.resolve(root, ".data", "pglite");
        fs.mkdirSync(dataDir, { recursive: true });
        pgliteInstance = new PGlite(dataDir);
      } catch (e) {
        pgliteInstance = new PGlite();
      }
    }
  }
  dbInstance = drizzlePglite(pgliteInstance, { schema });
  return dbInstance;
}

export async function initDb() {
  const db = getDb();
  
  // Ensure tables exist using standard SQL
  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      available_balance INTEGER NOT NULL DEFAULT 25000,
      transaction_limit INTEGER NOT NULL DEFAULT 10000,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      biller_name TEXT NOT NULL,
      category TEXT NOT NULL,
      account_number TEXT NOT NULL,
      amount INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      prompt TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      bill_id TEXT NOT NULL REFERENCES bills(id),
      biller_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payment_method TEXT NOT NULL DEFAULT 'UPI',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      bill_id TEXT REFERENCES bills(id),
      task_id TEXT REFERENCES tasks(id),
      approval_id TEXT REFERENCES approvals(id),
      idempotency_key TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      payee TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payment_method TEXT NOT NULL DEFAULT 'UPI',
      failure_reason TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mandates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      bill_id TEXT REFERENCES bills(id),
      biller_name TEXT NOT NULL,
      max_amount INTEGER NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'MONTHLY',
      next_execution_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      bill_id TEXT REFERENCES bills(id),
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      remind_before_days INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id),
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      details JSONB DEFAULT '{}',
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agent_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  if (pgliteInstance) {
    const statements = createTablesSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await pgliteInstance.exec(stmt);
      } catch (err) {
        console.error("Failed to execute DDL statement:", stmt.slice(0, 40), err);
      }
    }
  } else {
    // For pg Pool
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const client = new pg.Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query(createTablesSql);
      await client.end();
    }
  }

  // Auto-seed demo data if demo user does not exist yet (e.g. cold start on Vercel / clean instance)
  try {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, "demo-user-1"));
    if (existing.length === 0) {
      const { seed } = await import("./seed.js");
      await seed(true);
    }
  } catch (err) {
    // Non-fatal
  }

  return db;
}
