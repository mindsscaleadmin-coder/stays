/** Debounced browser sync — prevents render storms when many tabs/users write at once. */

const pending = new Map<string, ReturnType<typeof setTimeout>>();

function schedule(type: string, fire: () => void): void {
  if (typeof window === "undefined") return;
  const prev = pending.get(type);
  if (prev) clearTimeout(prev);
  pending.set(
    type,
    setTimeout(() => {
      pending.delete(type);
      fire();
    }, 50)
  );
}

export function emitSyncEvent(type: string): void {
  schedule(type, () => {
    window.dispatchEvent(new Event(type));
  });
}

export function emitSyncCustomEvent(type: string, detail?: unknown): void {
  schedule(type, () => {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  });
}
