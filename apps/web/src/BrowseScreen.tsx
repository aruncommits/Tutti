import { useEffect, useRef, useState } from "react";
import { LibraryBrowser } from "./LibraryBrowser";
import type { LibraryProvider } from "./library";

// V2 Browse screen: server catalog with tier-in-card selection + add toast with undo.

interface ToastState {
  dishName: string;
  recipeId: string;
  timerId: ReturnType<typeof setTimeout>;
}

function AddToast({ toast, onUndo, onDismiss }: { toast: ToastState; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div className="add-toast" role="status" aria-live="polite">
      <span className="add-toast-text">{toast.dishName} added to tonight's cook</span>
      <button
        className="add-toast-undo"
        onClick={() => { onUndo(); onDismiss(); }}
      >
        Undo
      </button>
    </div>
  );
}

export function BrowseScreen({
  provider,
  diets = [],
  selectedDishIds = [],
  onAddRecipe,
  onRemoveRecipe,
  onDetails,
}: {
  provider?: LibraryProvider;
  diets?: string[];
  selectedDishIds?: string[];
  onAddRecipe: (recipeId: string) => void;
  onRemoveRecipe?: (recipeId: string) => void;
  onDetails?: (recipeId: string) => void;
}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastRef = useRef<ToastState | null>(null);
  toastRef.current = toast;

  function showToast(recipeId: string, dishName: string) {
    if (toastRef.current) clearTimeout(toastRef.current.timerId);
    const timerId = setTimeout(() => setToast(null), 2000);
    setToast({ dishName, recipeId, timerId });
  }

  function dismissToast() {
    if (toast) clearTimeout(toast.timerId);
    setToast(null);
  }

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current.timerId); }, []);

  function handleAdd(recipeId: string, dishName?: string) {
    onAddRecipe(recipeId);
    if (dishName) showToast(recipeId, dishName);
  }

  return (
    <section className="zone" aria-label="Browse recipes">
      <h2 className="zone-h"><span>Browse</span></h2>
      <p className="screen-subtitle">Find your next recipe</p>

      <LibraryBrowser
        provider={provider}
        diets={diets}
        selectedDishIds={selectedDishIds}
        onAddRecipe={handleAdd}
        onDetails={onDetails}
        showTierInline
      />

      {toast && (
        <AddToast
          toast={toast}
          onUndo={() => onRemoveRecipe?.(toast.recipeId)}
          onDismiss={dismissToast}
        />
      )}
    </section>
  );
}
