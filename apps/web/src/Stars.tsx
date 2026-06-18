// Reusable 1–5 star control (Brief v17). Read-only when onRate is omitted.
export function Stars({
  value = 0,
  onRate,
  label,
}: {
  value?: number;
  onRate?: (n: number) => void;
  label?: string;
}) {
  if (!onRate) {
    // compact, read-only display
    return <span className="stars-ro" aria-label={`${value} of 5 stars`}>{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
  }
  return (
    <span className="stars" role="group" aria-label={label ?? "Rating"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star${n <= value ? " on" : ""}`}
          aria-label={`${label ? label + " " : ""}${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={n === value}
          onClick={() => onRate(n === value ? 0 : n)}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}
