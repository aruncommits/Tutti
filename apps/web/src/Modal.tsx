import { useEffect, type ReactNode } from "react";

// Lightweight overlay dialog — used to preview a recipe over the browse list (read before adding)
// without navigating away. Closes on the × button, a backdrop click, or Escape.

export function Modal({ onClose, label, children }: { onClose: () => void; label?: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("modal-open"); };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}
