import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const Boom = () => { throw new Error("boom"); };

afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary (Brief v35)", () => {
  it("renders a recoverable fallback when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {}); // expected error log
    const onHome = vi.fn();
    render(<ErrorBoundary onHome={onHome}><Boom /></ErrorBoundary>);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/your saved data is safe/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to home/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled(); // the error was logged, not swallowed
  });

  it("renders its children when nothing throws", () => {
    render(<ErrorBoundary><div>healthy content</div></ErrorBoundary>);
    expect(screen.getByText("healthy content")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});
