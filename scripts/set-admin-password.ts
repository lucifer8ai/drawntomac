import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!URL || !KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, or ADMIN_PASSWORD in environment.",
  );
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

async function main() {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const target = listData.users.find((u) => u.email === ADMIN_EMAIL);

  let userId: string | undefined;

  if (target) {
    userId = target.id;
    const { error } = await supabase.auth.admin.updateUserById(target.id, {
      password: ADMIN_PASSWORD,
    });
    if (error) {
      console.error("Failed to update admin password:", error.message);
      process.exit(1);
    }
    console.log(`Updated password for ${ADMIN_EMAIL}.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error("Failed to create admin user:", error?.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`Created admin user ${ADMIN_EMAIL}.`);
  }

  if (userId) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: true, onboarding_completed: true })
      .eq("id", userId);

    if (error) {
      console.error("Failed to set admin profile flags:", error.message);
      process.exit(1);
    }
  }

  console.log("Admin is ready to sign in.");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
