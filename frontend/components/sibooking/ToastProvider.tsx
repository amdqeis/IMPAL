"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  LucideIcon,
  X,
} from "lucide-react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastInput = {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type Toast = Required<Pick<ToastInput, "type" | "message">> &
  Pick<ToastInput, "title" | "duration"> & {
    id: string;
  };

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  success: (message: string, options?: Omit<ToastInput, "message" | "type">) => string;
  error: (message: string, options?: Omit<ToastInput, "message" | "type">) => string;
  warning: (message: string, options?: Omit<ToastInput, "message" | "type">) => string;
  info: (message: string, options?: Omit<ToastInput, "message" | "type">) => string;
};

const TOAST_DURATION = 4000;
const EXIT_DURATION = 220;
const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyle: Record<
  ToastType,
  {
    icon: LucideIcon;
    iconClassName: string;
    ringClassName: string;
    title: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClassName: "text-[#16A34A]",
    ringClassName: "border-[#BBF7D0]",
    title: "Berhasil",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "text-[#DC2626]",
    ringClassName: "border-[#FECACA]",
    title: "Error",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-[#D97706]",
    ringClassName: "border-[#FED7AA]",
    title: "Perhatian",
  },
  info: {
    icon: Info,
    iconClassName: "text-[#2563EB]",
    ringClassName: "border-[#BFDBFE]",
    title: "Info",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = `toast-${Date.now()}-${nextId.current}`;
    nextId.current += 1;

    setToasts((current) => [
      {
        id,
        type: toast.type ?? "info",
        title: toast.title,
        message: toast.message,
        duration: toast.duration,
      },
      ...current,
    ]);

    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, options) => showToast({ ...options, message, type: "success" }),
      error: (message, options) => showToast({ ...options, message, type: "error" }),
      warning: (message, options) => showToast({ ...options, message, type: "warning" }),
      info: (message, options) => showToast({ ...options, message, type: "info" }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed left-3 top-3 z-[100] flex w-[min(calc(100vw-1.5rem),24rem)] flex-col gap-2 sm:left-5 sm:top-5 sm:w-[22rem]"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}

function ToastCard({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (toastId: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const removeTimer = useRef<number | null>(null);
  const { icon: Icon, iconClassName, ringClassName, title } = toastStyle[toast.type];

  const close = useCallback(() => {
    setIsVisible(false);
    if (removeTimer.current) {
      window.clearTimeout(removeTimer.current);
    }
    removeTimer.current = window.setTimeout(() => onRemove(toast.id), EXIT_DURATION);
  }, [onRemove, toast.id]);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setIsVisible(true), 20);
    const autoCloseTimer = window.setTimeout(close, toast.duration ?? TOAST_DURATION);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(autoCloseTimer);
      if (removeTimer.current) {
        window.clearTimeout(removeTimer.current);
      }
    };
  }, [close, toast.duration]);

  return (
    <div
      className={`pointer-events-auto flex min-w-0 items-start gap-3 rounded-[10px] border bg-white/95 px-4 py-3 text-[#163C34] shadow-[0_16px_42px_rgba(17,48,41,0.14)] backdrop-blur transition-all duration-300 ease-out ${ringClassName} ${
        isVisible ? "translate-x-0 translate-y-0 opacity-100" : "-translate-x-4 -translate-y-2 opacity-0"
      }`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black leading-5">{toast.title ?? title}</p>
        <p className="mt-0.5 text-sm font-semibold leading-5 text-[#405852]">{toast.message}</p>
      </div>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={close}
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#667A75] transition hover:bg-[#EDF7F1] hover:text-[#173D35]"
      >
        <X className="h-4 w-4 stroke-[2.6]" aria-hidden="true" />
      </button>
    </div>
  );
}
