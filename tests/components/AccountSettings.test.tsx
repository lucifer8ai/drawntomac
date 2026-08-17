import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountSettings } from "@/components/profile/AccountSettings";

const { mockSupabase, mockEphemeral } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
  mockEphemeral: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

vi.mock("@/integrations/supabase/client-no-persist", () => ({
  createEphemeralSupabaseClient: () => mockEphemeral,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function openPasswordSection() {
  const user = userEvent.setup();
  render(<AccountSettings />);
  await user.click(
    screen.getAllByRole("button", { name: "Change Password" })[0],
  );
  return user;
}

function submitButton() {
  return screen.getAllByRole("button", { name: "Change Password" })[1];
}

describe("AccountSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call updateUser when current password is empty", async () => {
    const user = await openPasswordSection();

    await user.type(screen.getByPlaceholderText("New password"), "newpass1");
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpass1",
    );
    await user.click(submitButton());

    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("does not call updateUser when new passwords do not match", async () => {
    const user = await openPasswordSection();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "oldpass1",
    );
    await user.type(screen.getByPlaceholderText("New password"), "newpass1");
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "different",
    );
    await user.click(submitButton());

    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("does not call updateUser when new password equals current password", async () => {
    const user = await openPasswordSection();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "samepass1",
    );
    await user.type(screen.getByPlaceholderText("New password"), "samepass1");
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "samepass1",
    );
    await user.click(submitButton());

    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("blocks change when current password is wrong", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "a@b.co" } },
      error: null,
    });
    mockEphemeral.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid_grant" },
    });

    const user = await openPasswordSection();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "wrongpass",
    );
    await user.type(screen.getByPlaceholderText("New password"), "newpass1");
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpass1",
    );
    await user.click(submitButton());

    await waitFor(() => {
      expect(mockEphemeral.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "a@b.co",
        password: "wrongpass",
      });
    });

    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates password when current password verifies", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "a@b.co" } },
      error: null,
    });
    mockEphemeral.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access",
          refresh_token: "refresh",
          user: { id: "u1", email: "a@b.co", role: "authenticated" },
        },
      },
      error: null,
    });
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const user = await openPasswordSection();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "oldpass1",
    );
    await user.type(screen.getByPlaceholderText("New password"), "newpass1");
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpass1",
    );
    await user.click(submitButton());

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newpass1",
      });
    });
  });

  it("shows updateUser error and preserves fields", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "a@b.co" } },
      error: null,
    });
    mockEphemeral.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access",
          refresh_token: "refresh",
          user: { id: "u1", email: "a@b.co", role: "authenticated" },
        },
      },
      error: null,
    });
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "Reauthentication required" },
    });

    const user = await openPasswordSection();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "oldpass1",
    );
    await user.type(screen.getByPlaceholderText("New password"), "newpass1");
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpass1",
    );
    await user.click(submitButton());

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText("New password")).toHaveValue("newpass1");
  });
});
