import { Component, type ErrorInfo, type ReactNode } from "react";

// Route-level error boundary (Brief v35) — a render error in any screen degrades to a friendly,
// recoverable fallback instead of a blank page, keeping the cook unblocked (Doc 1 P4). Persisted
// data is untouched. Boundaries can't catch event-handler/async errors (those are guarded inline).

export class ErrorBoundary extends Component<
  { onHome?: () => void; children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error | null } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Tutti screen error:", error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <section className="zone" aria-label="Error">
          <h2 className="zone-h"><span>Something went wrong</span></h2>
          <p className="value">This screen hit a snag. Your saved data is safe.</p>
          <button
            className="btn"
            onClick={() => { this.props.onHome?.(); this.setState({ error: null }); }}
          >
            🏠 Back to home
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
