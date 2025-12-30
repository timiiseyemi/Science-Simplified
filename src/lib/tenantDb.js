import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

const pools = {};

export function getTenantPool(tenant) {
  if (pools[tenant]) return pools[tenant];

  // ✅ LOAD TENANT-SPECIFIC ENV
  dotenv.config({
    path: path.join(process.cwd(), `.env.${tenant}`),
    override: true,
  });

  console.log("→ Using DB:", {
    tenant,
    host: process.env.PGHOST,
    db: process.env.PGDATABASE,
  });

  const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT || 5432),
    ssl: { rejectUnauthorized: false },
  });

  pools[tenant] = pool;
  return pool;
}

export async function tenantQuery(tenant, text, params) {
  return getTenantPool(tenant).query(text, params);
}