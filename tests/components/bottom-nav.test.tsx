import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomNav } from "@/components/dashboard/bottom-nav";

vi.mock("@/components/dashboard/bottom-nav/bottom-nav.module.scss", () => ({
  default: {
    bottomNav: "bottomNav",
    navItem: "navItem",
    navItemActive: "navItemActive",
    navIcon: "navIcon",
    navLabel: "navLabel",
    navBadge: "navBadge",
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const tabs = [
  { key: "habits", label: "Habits", icon: <span>📋</span> },
  { key: "family", label: "Family", icon: <span>👨‍👩‍👧</span>, badge: 3 },
  { key: "stats", label: "Stats", icon: <span>📊</span>, badge: 0 },
];

describe("BottomNav", () => {
  it("renders all tabs", () => {
    render(<BottomNav tabs={tabs} activeTab="habits" onTabChange={() => {}} />);
    expect(screen.getByText("Habits")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("applies active class to current tab", () => {
    render(<BottomNav tabs={tabs} activeTab="habits" onTabChange={() => {}} />);
    const habitsBtn = screen.getByText("Habits").closest("button");
    expect(habitsBtn?.className).toContain("navItemActive");
    const familyBtn = screen.getByText("Family").closest("button");
    expect(familyBtn?.className).not.toContain("navItemActive");
  });

  it("calls onTabChange when tab is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BottomNav tabs={tabs} activeTab="habits" onTabChange={onChange} />);
    await user.click(screen.getByText("Family"));
    expect(onChange).toHaveBeenCalledWith("family");
  });

  it("shows badge when > 0", () => {
    render(<BottomNav tabs={tabs} activeTab="habits" onTabChange={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show badge when 0", () => {
    render(<BottomNav tabs={tabs} activeTab="habits" onTabChange={() => {}} />);
    // Stats has badge=0, should not render badge element
    const statsBadges = screen.queryAllByText("0");
    // Filter to only badge elements
    expect(statsBadges.length).toBe(0);
  });

  it("shows 9+ for badges > 9", () => {
    const tabsWithHighBadge = [
      { key: "alerts", label: "Alerts", icon: <span>🔔</span>, badge: 15 },
    ];
    render(<BottomNav tabs={tabsWithHighBadge} activeTab="alerts" onTabChange={() => {}} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});
