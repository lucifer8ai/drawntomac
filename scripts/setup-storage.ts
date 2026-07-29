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

  const buckets: Array<{ name: string; public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }> = [
    { name: "avatars", public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
    { name: "banners", public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
    { name: "artwork", public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] },
  ];

  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });

    if (error && error.message !== "Duplicate") {
      console.error(`Failed to create bucket "${bucket.name}":`, error.message);
    } else {
      console.log(`Bucket "${bucket.name}" ready (public=${bucket.public}).`);
    }
  }

  console.log("Done.");
}

main();
