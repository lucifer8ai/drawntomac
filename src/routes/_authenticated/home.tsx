import { createFileRoute } from "@tanstack/react-router";
import { useTabContext } from "./route";
import { FeedPage } from "@/components/feed/FeedPage";
import { DiaryPage } from "@/components/feed/DiaryPage";
import { DiscoverPage } from "@/components/feed/DiscoverPage";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [{ title: "#drawnto" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { activeTab: tab } = useTabContext();

  return (
    <>
      {tab === "feed" && <FeedPage />}
      {tab === "diary" && <DiaryPage />}
      {tab === "discover" && <DiscoverPage />}
    </>
  );
}
