export const FLASH_KEY = "barkada-split:flash";

type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

/** Show a toast on the mounted toast host (AppNav). */
export function toast(message: string): void {
  listener?.(message);
}

/** Toast now and re-show the message once after the next navigation. */
export function flashToast(message: string): void {
  try {
    window.sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Session storage unavailable — the live toast still fires.
  }
  toast(message);
}

export function bindToast(next: ToastListener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

export function consumeFlash(): string | null {
  try {
    const message = window.sessionStorage.getItem(FLASH_KEY);
    if (message) window.sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
