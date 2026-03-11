import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/toast";

// Mock SCSS modules
vi.mock("@/components/ui/toast/toast.module.scss", () => ({
  default: {
    toastContainer: "toastContainer",
    toast: "toast",
    toastSuccess: "toastSuccess",
    toastError: "toastError",
    toastInfo: "toastInfo",
    toastExiting: "toastExiting",
    toastIcon: "toastIcon",
    toastMessage: "toastMessage",
  },
}));

vi.mock("@/components/icons", () => ({
  CheckIcon: () => <span data-testid="check-icon" />,
  BoltIcon: () => <span data-testid="bolt-icon" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

function TestComponent() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast("Success!", "success")}>Show Success</button>
      <button onClick={() => showToast("Error!", "error")}>Show Error</button>
      <button onClick={() => showToast("Info!")}>Show Info</button>
    </div>
  );
}

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("shows toast when triggered", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText("Show Success").click();
    });

    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("shows error toast", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText("Show Error").click();
    });

    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("throws when useToast is used outside provider", () => {
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow("useToast must be used within a ToastProvider");
  });
});
