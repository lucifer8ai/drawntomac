import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarStack, type AvatarUser } from "../../src/components/feed/AvatarStack";

describe("AvatarStack", () => {
  const users: AvatarUser[] = [
    { userId: "1", username: "alice", displayName: "Alice", avatarUrl: null },
    { userId: "2", username: "bob", displayName: null, avatarUrl: null },
  ];

  it("renders all avatars when count <= maxVisible", () => {
    render(<AvatarStack users={users} maxVisible={4} />);
    const nameList = screen.getByText("Alice, bob");
    expect(nameList).toBeTruthy();
  });

  it("renders +N badge when count > maxVisible", () => {
    const manyUsers: AvatarUser[] = [
      { userId: "1", username: "a", displayName: null, avatarUrl: null },
      { userId: "2", username: "b", displayName: null, avatarUrl: null },
      { userId: "3", username: "c", displayName: null, avatarUrl: null },
      { userId: "4", username: "d", displayName: null, avatarUrl: null },
      { userId: "5", username: "e", displayName: null, avatarUrl: null },
    ];
    render(<AvatarStack users={manyUsers} maxVisible={4} />);
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("renders nothing for empty array", () => {
    const { container } = render(<AvatarStack users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows initials when no avatar URL", () => {
    render(<AvatarStack users={users} />);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });
});
