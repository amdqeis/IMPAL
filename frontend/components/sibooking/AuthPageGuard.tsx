"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

import { ApiError, api, clearAuth, getStoredToken, refreshStoredAuth } from "@/lib/api";
import { getDashboardPathForRoles } from "@/lib/auth";
import { useToast } from "./ToastProvider";

export function AuthPageGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const hasChecked = useRef(false);
  const [canShowPage, setCanShowPage] = useState(false);

  useEffect(() => {
    if (hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    const validateSession = async () => {
      const token = getStoredToken();

      if (!token) {
        setCanShowPage(true);
        return;
      }

      try {
        const auth = await api.auth.me();
        refreshStoredAuth(auth);
        toast.info("Kamu sudah login, diarahkan ke dashboard.");
        router.replace(getDashboardPathForRoles(auth.roles));
      } catch (err) {
        clearAuth();

        if (err instanceof ApiError && err.status === 401) {
          toast.warning("Sesi kamu sudah berakhir. Silakan login kembali.");
        } else {
          toast.warning("Sesi tidak dapat diverifikasi. Silakan login kembali.");
        }

        setCanShowPage(true);
      }
    };

    void validateSession();
  }, [router, toast]);

  if (!canShowPage) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#8ed25c] px-6 text-[#173b34]">
        <div className="absolute inset-0 bg-[linear-gradient(100deg,_#4eaabd_0%,_#66c59d_48%,_#94de5c_100%)]" />
        <div className="relative z-10 rounded-[14px] border border-white/35 bg-white/20 px-5 py-4 text-sm font-black shadow-[0_18px_46px_rgba(18,57,48,0.14)] backdrop-blur">
          Memeriksa sesi...
        </div>
      </main>
    );
  }

  return children;
}
