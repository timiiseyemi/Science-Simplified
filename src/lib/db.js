// lib/db.js

import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

export async function query(text, params) {
    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log("Executed query", { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error("Error executing query", error);
        throw error;
    }
}

export default pool;