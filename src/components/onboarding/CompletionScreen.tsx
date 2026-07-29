import { useNavigate } from "@tanstack/react-router";

interface CompletionScreenProps {
  artistCount: number;
}

export function CompletionScreen({ artistCount }: CompletionScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 text-center">
      <h2
        className="text-[28px] font-bold text-foreground animate-fade-in-up"
        style={{ fontFamily: "DM Sans, sans-serif", animationDelay: "0ms" }}
      >
        You're all set.
      </h2>
      <p className="text-base text-muted-foreground animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        {artistCount === 0
          ? "Your feed is ready."
          : `Listening to ${artistCount} ${artistCount === 1 ? "artist" : "artists"}. Your feed is already warming up.`}
      </p>
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="inline-flex items-center gap-2 min-h-[44px] rounded-lg px-6 py-2.5 bg-primary text-primary-foreground font-semibold text-sm"
        >
          Go to your feed →
        </button>
      </div>
    </div>
  );
}
