import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadFieldProps {
  label: string;
  currentUrl: string | null;
  uploadPath: string;
  onUploaded: (url: string) => void;
}

export function ImageUploadField({ label, currentUrl, uploadPath, onUploaded }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", uploadPath);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/admin/upload-artwork", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        setPreview(url);
        onUploaded(url);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt={label}
            className="max-h-48 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition hover:opacity-100"
          >
            <span className="text-xs font-semibold text-white">Replace</span>
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
          className="flex h-32 w-48 items-center justify-center rounded-lg border border-dashed border-white/[0.12] text-xs text-muted-foreground transition hover:border-white/[0.24] hover:text-white cursor-pointer"
        >
          {uploading ? "Uploading..." : "Click to upload"}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
