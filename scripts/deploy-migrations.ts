import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, appendFileSync } from "fs";
import { resolve } from "path";

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
  );
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const MIGRATIONS_DIR = resolve(
  import.meta.dirname,
  "../supabase/migrations",
);
const DEPLOYED_FILE = resolve(
  import.meta.dirname,
  "../supabase/.deployed-migrations",
);
const BRIDGE_FILE = resolve(import.meta.dirname, "../supabase/exec_sql.sql");

function getDeployed(): Set<string> {
  try {
    return new Set(
      readFileSync(DEPLOYED_FILE, "utf-8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function markDeployed(file: string) {
  appendFileSync(DEPLOYED_FILE, file + "\n");
}

async function ensureBridge(): Promise<boolean> {
  // Check if exec_sql RPC already exists
  const { error } = await supabase
    .rpc("exec_sql", { query: "SELECT 1" })
    .maybeSingle();

  if (!error) return true;

  // Try to create the bridge from exec_sql.sql
  try {
    const ddl = readFileSync(BRIDGE_FILE, "utf-8");
    // exec_sql doesn't exist, and we can't create it without... exec_sql.
    // This is a chicken-and-egg problem solved by one manual deploy.
  } catch {
    // exec_sql.sql not found -- expected on first run
  }

  return false;
}

async function main() {
  const bridgeOk = await ensureBridge();
  if (!bridgeOk) {
    console.log(
      "\nbridge not deployed. Deploy it once manually via Supabase SQL Editor:",
    );
    console.log(
      "  CREATE OR REPLACE FUNCTION public.exec_sql(query text)",
    );
    console.log(
      "  RETURNS void LANGUAGE plpgsql SECURITY DEFINER",
    );
    console.log("  SET search_path = public AS $$ BEGIN EXECUTE query; END; $$;");
    console.log(
      "\nThen re-run: npx tsx scripts/deploy-migrations.ts\n",
    );
    process.exit(0);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const deployed = getDeployed();
  let failed = false;

  for (const file of files) {
    if (deployed.has(file)) {
      console.log(`  (done) ${file}`);
      continue;
    }

    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf-8");
    const { error } = await supabase
      .rpc("exec_sql", { query: sql })
      .maybeSingle();

    if (error) {
      console.error(`  FAILED  ${file}: ${error.message}`);
      failed = true;
      break;
    }

    console.log(`  OK  ${file}`);
    markDeployed(file);
  }

  if (failed) {
    console.error("\nFix the error above and re-run.");
    process.exit(1);
  }

  console.log(`\nDeployed ${files.length} migrations.`);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
