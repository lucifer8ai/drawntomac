interface TypeDotProps {
  type: "heard" | "like" | "dislike" | "review" | "want";
}

const labelMap: Record<string, string> = {
  heard: "heard",
  like: "liked",
  dislike: "disliked",
  review: "reviewed",
  want: "wants to hear",
};

const colorMap: Record<string, string> = {
  heard: "bg-heard",
  like: "bg-like",
  dislike: "bg-dislike",
  want: "bg-want",
  review: "bg-save",
};

export function TypeDot({ type }: TypeDotProps) {
  return (
    <span
      aria-label={labelMap[type]}
      className={`absolute bottom-1 right-1 h-2.5 w-2.5 md:h-3 md:w-3 rounded-full ring-1 ring-black/20 ${colorMap[type]} ${type === "review" ? "ring-1 ring-white/30" : ""}`}
    />
  );
}
