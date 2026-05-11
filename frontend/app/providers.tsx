"use client";

import { ReactNode } from "react";

import { ToastProvider } from "@/components/sibooking/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
