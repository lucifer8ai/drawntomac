import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { UserMinus } from "lucide-react";

interface FollowerRow {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
}

export function FollowListSheet({
  open,
  onClose,
  type,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  type: "following" | "followers";
  userId: string | null;
}) {
  const [rows, setRows] = useState<FollowerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);

    const column = type === "following" ? "follower_id" : "following_id";
    const idCol = type === "following" ? "following_id" : "follower_id";

    supabase
      .from("follows")
      .select(idCol)
      .eq(column, userId)
      .then(async ({ data, error }) => {
        if (error || !data) {
          setLoading(false);
          return;
        }
        const ids = data.map((r: any) => r[idCol]);
        if (ids.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, display_name")
          .in("id", ids);
        setRows(
          (profiles ?? []).map((p) => ({
            id: p.id,
            username: p.username,
            avatar_url: p.avatar_url,
            display_name: p.display_name,
          })),
        );
        setLoading(false);
      });
  }, [open, userId, type]);

  async function handleUnfollow(targetId: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== targetId));
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{type === "following" ? "Following" : "Followers"}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
          {loading && (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              {type === "following" ? "Not following anyone yet." : "No followers yet."}
            </div>
          )}
          {rows.map((row) => (
            <Link
              key={row.id}
              to="/user/$username"
              params={{ username: row.username }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-white/[0.03] transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                {row.avatar_url ? (
                  <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {(row.username ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {row.display_name ?? row.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{row.username}
                </div>
              </div>
              {type === "following" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleUnfollow(row.id);
                  }}
                >
                  <UserMinus size={16} />
                </Button>
              )}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
