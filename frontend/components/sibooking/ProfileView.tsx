"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, api, clearAuth, refreshStoredAuth, type User } from "@/lib/api";
import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";

export function ProfileView({ role }: { role: "user" | "admin" | "owner" }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loginPath = role === "user" ? "/login" : "/admin/login";

  useEffect(() => {
    let active = true;

    api.auth
      .me()
      .then((auth) => {
        if (!active) {
          return;
        }

        refreshStoredAuth(auth);
        setUser(auth.user);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          clearAuth();
          router.replace(loginPath);
          return;
        }

        setError(err instanceof Error ? err.message : "Gagal memuat profil.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loginPath, router]);

  return (
    <AppShell role={role}>
      <div className="w-full max-w-[1180px] px-4 py-9 sm:px-6 md:px-8">
        <h1 className="text-[38px] font-extrabold leading-none text-[#0F4C3E]">Profile</h1>
        {loading ? <div className="mt-6"><LoadingState label="Memuat profil..." /></div> : null}
        {error ? <div className="mt-6"><ErrorState message={error} /></div> : null}
        {!loading && !error && !user ? <div className="mt-6"><EmptyState message="Profil tidak tersedia." /></div> : null}
        {user ? (
          <>
            <h2 className="mt-2 text-[32px] font-black leading-none text-[#1F2937]">{user.nama}</h2>
            <section className="mt-10 max-w-[532px] space-y-3">
              <ProfileRow label="Full Name" value={user.nama} />
              <ProfileRow label="E-mail" value={user.email} underline />
              <ProfileRow label="No.HP" value={user.no_hp} />
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function ProfileRow({ label, value, underline = false }: { label: string; value: string; underline?: boolean }) {
  return (
    <div>
      <h3 className="text-[30px] font-black leading-none text-[#174D3D]">{label}</h3>
      <div className="mt-2 flex h-[50px] items-center rounded-full bg-[#D6EFDE] px-5 text-[24px] font-black text-[#1F2937]">
        <span className={underline ? "underline underline-offset-4" : ""}>{value}</span>
      </div>
    </div>
  );
}
