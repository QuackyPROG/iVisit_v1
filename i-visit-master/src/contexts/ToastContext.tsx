import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "info" | "success" | "error" | "warning";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (
    message: string,
    options?: {
      variant?: ToastVariant;
      durationMs?: number;
    }
  ) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (
      message: string,
      options?: {
        variant?: ToastVariant;
        durationMs?: number;
      }
    ) => {
      const variant = options?.variant ?? "info";
      const durationMs = options?.durationMs ?? 4000;

      const id =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : null) ?? Math.random().toString(36).slice(2, 9);

      const toast: ToastItem = { id, message, variant };
      setToasts((prev) => [...prev, toast]);

      // auto-remove
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    []
  );

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const variantClasses = (variant: ToastVariant) => {
    switch (variant) {
      case "success":
        return "bg-emerald-600 border-emerald-400";
      case "error":
        return "bg-red-600 border-red-400";
      case "warning":
        return "bg-amber-600 border-amber-400";
      default:
        return "bg-slate-700 border-slate-400";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between gap-3 border rounded-lg px-3 py-2 text-sm text-white shadow-lg ${variantClasses(
              t.variant
            )}`}
          >
            <span className="flex-1 whitespace-pre-line">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ml-2 text-xs font-semibold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return ctx;
}
