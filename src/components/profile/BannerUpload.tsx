import { useRef, useCallback } from "react";
import { Upload, Trash2 } from "lucide-react";

export function BannerUpload({
  bannerUrl,
  onUpload,
  disabled,
  onRemove,
}: {
  bannerUrl: string | null;
  onUpload: (file: File) => void;
  disabled?: boolean;
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
      className="relative w-full aspect-[3/1] overflow-hidden bg-black cursor-pointer group active:scale-[0.97] transition-transform duration-150"
      style={{ borderRadius: 0 }}
    >
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt="Banner"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <span className="text-4xl md:text-5xl font-semibold tracking-tight text-primary">
            #d.You
          </span>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Upload className="h-6 w-6 text-white" />
      </div>
      {bannerUrl && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <Trash2 size={16} className="text-white" />
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
