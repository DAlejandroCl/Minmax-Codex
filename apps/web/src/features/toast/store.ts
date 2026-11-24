import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

interface ToastState {
  readonly toasts: readonly Toast[];
  push(kind: ToastKind, message: string): number;
  dismiss(id: number): void;
  clear(): void;
}

let nextId = 1;
const MAX_VISIBLE = 4;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Los errores permanecen más tiempo para dar margen de lectura. */
export const toastDuration = (kind: ToastKind): number => (kind === "error" ? 9000 : 5000);
