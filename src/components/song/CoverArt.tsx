import { useCallback, useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

function useAudio(url: string | null) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!url || typeof Audio === "undefined") return;
    const a = new Audio(url);
    setAudio(a);
    return () => { a.pause(); };
  }, [url]);
  return audio;
}

export function CoverArt({
  url,
  title,
  previewUrl,
}: {
  url: string | null;
  title: string;
  previewUrl: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-[240px] md:max-w-[320px] md:mx-0">
      <div
        className="aspect-square w-full overflow-hidden rounded-2xl border bg-raised"
      >
        {url ? (
          <img src={url} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl md:text-6xl text-white/20">♫</div>
        )}
      </div>
      <PreviewButton url={previewUrl} />
    </div>
  );
}

function PreviewButton({ url }: { url: string | null }) {
  const [playing, setPlaying] = useState(false);
  const audio = useAudio(url);

  const onEnded = useCallback(() => setPlaying(false), []);

  useEffect(() => {
    if (!audio) return;
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
    };
  }, [audio, onEnded]);

  if (!url || !audio) return null;

  return (
    <Button
      type="button"
      shape="pill"
      onClick={() => {
        if (playing) {
          audio.pause();
          setPlaying(false);
        } else {
          audio.play().catch(() => {});
          setPlaying(true);
        }
      }}
      className="mt-4 w-full"
    >
      {playing ? <Pause size={14} /> : <Play size={14} />}
      {playing ? "Pause preview" : "Play 30s preview"}
    </Button>
  );
}
