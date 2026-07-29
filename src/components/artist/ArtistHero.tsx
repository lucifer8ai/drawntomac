import type { ReactNode } from "react";

export function ArtistHero({
  imageUrl,
  children,
}: {
  imageUrl: string | null;
  children: ReactNode;
}) {
  return (
    <div className="relative w-screen -mx-[calc((100vw-100%)/2)] h-[280px] md:h-[320px] overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-secondary/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-4 pb-6">
        {children}
      </div>
    </div>
  );
}
