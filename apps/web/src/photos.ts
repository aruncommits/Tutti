// Finished-dish photos (Brief v33) — a small, capped, quota-safe store of thumbnail data URLs keyed
// by recipe. The store helpers are pure; resizeToThumb is browser-only (canvas) and feature-detected
// so jsdom/SSR never crash. Thumbnails are tiny (~160px JPEG) to stay well within localStorage.

export type Photos = Record<string, string>; // recipeId -> data URL

/** Set/replace a recipe's photo; if over cap, drop the oldest *other* entries (never the new one). */
export function addPhoto(map: Photos, id: string, dataUrl: string, cap = 12): Photos {
  const next: Photos = { ...map, [id]: dataUrl };
  const keys = Object.keys(next);
  if (keys.length > cap) {
    for (const k of keys.slice(0, keys.length - cap)) {
      if (k !== id) delete next[k];
    }
  }
  return next;
}

export function removePhoto(map: Photos, id: string): Photos {
  const next = { ...map };
  delete next[id];
  return next;
}

/** Resize an image File to a JPEG thumbnail data URL (longest side ≤ max). Browser-only. */
export function resizeToThumb(file: File, max = 160): Promise<string> {
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    return Promise.reject(new Error("canvas unavailable"));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("resize failed"));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}
