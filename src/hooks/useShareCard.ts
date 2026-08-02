import { useRef, useCallback } from "react";
import { toPng } from "html-to-image";

interface UseShareCardOptions {
  cardWidth?: number;
  cardHeight?: number;
  filename?: string;
}

export function useShareCard({
  cardWidth = 1080,
  cardHeight = 1080,
  filename = "taste-card.png",
}: UseShareCardOptions = {}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const exportImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    try {
      const dataUrl = await toPng(cardRef.current, {
        width: cardWidth,
        height: cardHeight,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "oklch(0.04 0.002 280)",
      });

      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (err) {
      console.error("[useShareCard] export failed:", err);
      return null;
    }
  }, [cardWidth, cardHeight]);

  const share = useCallback(async (shareTitle?: string) => {
    const blob = await exportImage();
    if (!blob) return false;

    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: shareTitle ?? "My taste on #drawnto",
        });
        return true;
      } catch {
        // user cancelled or share failed — fall through to download
      }
    }

    // Fallback: download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [exportImage, filename]);

  return { cardRef, exportImage, share };
}
