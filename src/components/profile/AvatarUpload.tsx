import { useRef, useCallback } from "react";
import { Upload, Trash2 } from "lucide-react";

export function AvatarUpload({
  avatarUrl,
  onUpload,
  disabled,
  displayName,
  onRemove,
}: {
  avatarUrl: string | null;
  onUpload: (file: File) => void;
  disabled?: boolean;
  displayName?: string;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  }, [onRemove]);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={disabled}
      className="relative h-24 w-24 rounded-full overflow-hidden border-[3px] border-background bg-muted cursor-pointer group active:scale-[0.97] transition-transform duration-150 shrink-0"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName ?? "Avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
          {(displayName ?? "U").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Upload className="h-5 w-5 text-white" />
      </div>
      {avatarUrl && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="absolute top-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <Trash2 size={14} className="text-white" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </button>
  );
}
