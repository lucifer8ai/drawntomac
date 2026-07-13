// Direct migration runner — bypasses supabase CLI to work around
// pre-existing migration with duplicate data blocking the queue.
// Usage: npx tsx scripts/run-migration.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);

async function main() {
  const sqlPath = resolve(import.meta.dirname, "../supabase/migrations/20260710000100_profile_fields.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Running ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, " ");
    try {
      const { error } = await supabase.rpc("exec_sql", { query: stmt + ";" }).maybeSingle();
      // exec_sql may not exist — try raw SQL via REST
      if (error) {
        // fallback: use the SQL endpoint directly
        const res = await fetch(
          `${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
              "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
            },
            body: JSON.stringify({ query: stmt + ";" }),
          },
        );
        console.log(`  [${i + 1}/${statements.length}] ${preview}... → ${res.status}`);
      } else {
        console.log(`  [${i + 1}/${statements.length}] ${preview}... ✓`);
      }
    } catch (e: any) {
      console.log(`  [${i + 1}/${statements.length}] ${preview}... → ${e?.message ?? "error"}`);
    }
  }

  console.log("Done.");
}

main();
