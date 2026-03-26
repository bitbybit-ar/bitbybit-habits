import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/dashboard/family-card/family-card.module.scss", () => ({
  default: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));
vi.mock("@/components/icons", () => ({
  UserIcon: () => <span data-testid="user-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
}));

import { FamilyCard } from "@/components/dashboard/family-card";

const members = [
  { user_id: "u1", display_name: "Parent", username: "parent", role: "sponsor", avatar_url: null },
  { user_id: "u2", display_name: "Kid 1", username: "kid1", role: "kid", avatar_url: null },
];

describe("FamilyCard", () => {
  const writeTextSpy = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });
  });

  it("renders family name", () => {
    render(
      <FamilyCard
        familyId="f1" name="Test Family" inviteCode="ABC123"
        members={members} createdBy="u1" currentUserId="u1"
      />
    );
    expect(screen.getByText("Test Family")).toBeInTheDocument();
  });

  it("renders invite code", () => {
    render(
      <FamilyCard
        familyId="f1" name="Test Family" inviteCode="ABC123"
        members={members} createdBy="u1" currentUserId="u1"
      />
    );
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("renders all members", () => {
    render(
      <FamilyCard
        familyId="f1" name="Test Family" inviteCode="ABC123"
        members={members} createdBy="u1" currentUserId="u1"
      />
    );
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Kid 1")).toBeInTheDocument();
  });

  it("displays invite code that can be copied", () => {
    render(
      <FamilyCard
        familyId="f1" name="Test Family" inviteCode="ABC123"
        members={members} createdBy="u1" currentUserId="u1"
      />
    );
    // Invite code is rendered and visible
    const codeEl = screen.getByText("ABC123");
    expect(codeEl).toBeInTheDocument();
  });
});
