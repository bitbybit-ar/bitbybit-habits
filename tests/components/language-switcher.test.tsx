import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/layout/language-switcher/language-switcher.module.scss", () => ({
  default: { switcher: "switcher", btn: "btn", active: "active" },
}));

import { LanguageSwitcher } from "@/components/layout/language-switcher";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document.cookie
    Object.defineProperty(document, "cookie", { writable: true, value: "" });
  });

  it("renders ES and EN buttons", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("marks current locale as active", () => {
    render(<LanguageSwitcher />);
    const enBtn = screen.getByText("EN");
    expect(enBtn.className).toContain("active");
  });

  it("does not navigate when clicking current locale", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByText("EN"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("switches locale and sets cookie", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByText("ES"));
    expect(document.cookie).toContain("NEXT_LOCALE=es");
    expect(mockReplace).toHaveBeenCalledWith("/dashboard", { locale: "es" });
  });
});
