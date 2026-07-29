import { useTabContext } from "@/routes/_authenticated/route";

interface EmptyFeedStateProps {
  followingCount: number;
}

export function EmptyFeedState({ followingCount }: EmptyFeedStateProps) {
  const { setTab } = useTabContext();

  if (followingCount === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-primary">
          Your Feed is quiet.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover people with compatible taste — find your music twin.
        </p>
        <button
          onClick={() => setTab("discover")}
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          See who to follow
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="text-xl font-bold text-primary">
        Your Feed is quiet.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your friends haven&apos;t posted yet. Start the conversation — log a listen.
      </p>
      <button
        onClick={() => setTab("discover")}
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Explore music
      </button>
    </div>
  );
}
