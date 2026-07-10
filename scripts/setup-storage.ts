// Run once to create Supabase Storage buckets for profile media.
// Usage: npx tsx scripts/setup-storage.ts
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
// The service role key is needed for bucket creation.

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } },
  );

  const buckets = [
    { name: "avatars", public: true },
    { name: "banners", public: true },
  ];

  for (const { name, public: isPublic } of buckets) {
    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });

    if (error && error.message !== "Duplicate") {
      console.error(`Failed to create bucket "${name}":`, error.message);
    } else {
      console.log(`Bucket "${name}" ready (public=${isPublic}).`);
    }
  }

  console.log("Done.");
}

main();
