export interface AvatarUser {
  userId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

interface AvatarStackProps {
  users: AvatarUser[];
  maxVisible?: number;
}

export function AvatarStack({ users, maxVisible = 4 }: AvatarStackProps) {
  const visible = users.slice(0, maxVisible);
  const extra = users.length - maxVisible;

  if (users.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((user, i) => {
          const name = user.displayName ?? user.username;
          const initial = (name[0] ?? "?").toUpperCase();
          return (
            <div
              key={user.userId}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-primary-foreground ring-[3px] ring-raised"
              style={{
                backgroundColor: user.avatarUrl ? "transparent" : "var(--color-primary)",
                zIndex: visible.length - i,
              }}
              title={name}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${name} avatar`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                initial
              )}
            </div>
          );
        })}
        {extra > 0 && (
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-[3px] ring-raised"
            style={{ zIndex: 0 }}
          >
            +{extra}
          </div>
        )}
      </div>
      <span className="ml-2 text-sm md:text-base text-foreground">
        {users.map((u) => u.displayName ?? u.username).join(", ")}
      </span>
    </div>
  );
}
