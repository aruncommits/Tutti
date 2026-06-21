import { useState, type ReactNode } from "react";

// Uniform "tap to read the full text" pattern for truncated display text. Used app-wide so long step
// instructions, dish lists, etc. clamp to a couple of lines and reveal in full on tap. Accordion:
// only one item per list is open at a time (opening one collapses the previous).

/** One-open-at-a-time state for a list of expandable items. */
export function useAccordion() {
  const [open, setOpen] = useState<string | null>(null);
  return {
    isOpen: (key: string) => open === key,
    toggle: (key: string) => setOpen((o) => (o === key ? null : key)),
  };
}

/** Clamped text that expands to full on tap. Pass the FULL text; it's line-clamped when closed. */
export function ExpandText({
  text,
  open,
  onToggle,
  clamp = 2,
  className = "",
}: {
  text: ReactNode;
  open: boolean;
  onToggle: () => void;
  clamp?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <button type="button" className={`expandable${open ? " open" : ""} ${className}`} aria-expanded={open} onClick={onToggle}>
      <span className={open ? "" : `clamp clamp-${clamp}`}>{text}</span>
      <span className="expandable-caret" aria-hidden="true">{open ? "▾" : "▸"}</span>
    </button>
  );
}
