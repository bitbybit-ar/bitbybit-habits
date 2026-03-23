import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/dashboard/habit-card/habit-card.module.scss", () => ({
  default: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));
vi.mock("@/components/dashboard/edit-habit-modal/edit-habit-modal.module.scss", () => ({
  default: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));
vi.mock("@/components/icons", () => ({
  CheckIcon: ({ size }: { size?: number }) => <span data-testid="check-icon">{size}</span>,
  FlameIcon: ({ size }: { size?: number }) => <span data-testid="flame-icon">{size}</span>,
  BoltIcon: ({ size }: { size?: number }) => <span data-testid="bolt-icon">{size}</span>,
  ClockIcon: ({ size }: { size?: number }) => <span data-testid="clock-icon">{size}</span>,
  PencilIcon: ({ size }: { size?: number }) => <span data-testid="pencil-icon">{size}</span>,
}));
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));
vi.mock("@/components/dashboard/edit-habit-modal", () => ({
  EditHabitModal: () => <div data-testid="edit-modal">Edit Modal</div>,
}));

import { HabitCard } from "@/components/dashboard/habit-card";
import type { Habit, Completion } from "@/lib/types";

const baseHabit: Habit = {
  id: "h1",
  created_by: "u1",
  assigned_to: "u2",
  name: "Read a book",
  description: "Read for 30 minutes",
  color: "#F7A825",
  sat_reward: 50,
  schedule_type: "daily",
  verification_type: "sponsor_approval",
  active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const todayStr = new Date().toISOString().split("T")[0];

describe("HabitCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders habit name and description", () => {
    render(<HabitCard habit={baseHabit} completions={[]} onComplete={() => {}} />);
    expect(screen.getByText("Read a book")).toBeInTheDocument();
    expect(screen.getByText("Read for 30 minutes")).toBeInTheDocument();
  });

  it("renders sat reward", () => {
    render(<HabitCard habit={baseHabit} completions={[]} onComplete={() => {}} />);
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("shows clickable circle for today when not completed", () => {
    render(<HabitCard habit={baseHabit} completions={[]} onComplete={() => {}} />);
    // Today's circle should be clickable (role="button")
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows pending status when completion is pending", () => {
    const completions: Completion[] = [{
      id: "c1", habit_id: "h1", user_id: "u2", date: todayStr,
      status: "pending", completed_at: todayStr,
    }];
    render(<HabitCard habit={baseHabit} completions={completions} onComplete={() => {}} />);
    expect(screen.getByText("dashboard.pendingApproval")).toBeInTheDocument();
  });

  it("shows completed status when approved", () => {
    const completions: Completion[] = [{
      id: "c1", habit_id: "h1", user_id: "u2", date: todayStr,
      status: "approved", completed_at: todayStr,
    }];
    render(<HabitCard habit={baseHabit} completions={completions} onComplete={() => {}} />);
    expect(screen.getByText("dashboard.completed")).toBeInTheDocument();
  });

  it("calls onComplete when today's circle clicked", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<HabitCard habit={baseHabit} completions={[]} onComplete={onComplete} />);
    // Find today's clickable circle (last circle with role="button")
    const buttons = screen.getAllByRole("button");
    const todayCircle = buttons.find((b) => !b.closest("[class*='habitActions']"));
    expect(todayCircle).toBeDefined();
    if (todayCircle) await user.click(todayCircle);
    expect(onComplete).toHaveBeenCalledWith("h1");
  });

  it("shows streak when > 0", () => {
    render(<HabitCard habit={baseHabit} completions={[]} onComplete={() => {}} streak={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("hides action when hideAction is true", () => {
    render(<HabitCard habit={baseHabit} completions={[]} onComplete={() => {}} hideAction />);
    expect(screen.queryByText("habits.markComplete")).not.toBeInTheDocument();
  });

  it("shows edit/delete buttons for creator", () => {
    render(
      <HabitCard
        habit={baseHabit}
        completions={[]}
        onComplete={() => {}}
        currentUserId="u1"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByTitle("common.edit")).toBeInTheDocument();
    expect(screen.getByTitle("common.delete")).toBeInTheDocument();
  });

  it("does not show edit buttons for non-creator", () => {
    render(
      <HabitCard
        habit={baseHabit}
        completions={[]}
        onComplete={() => {}}
        currentUserId="u99"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.queryByTitle("common.edit")).not.toBeInTheDocument();
  });
});
