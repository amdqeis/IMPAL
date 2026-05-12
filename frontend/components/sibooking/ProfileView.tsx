"use client";

import { AppShell } from "@/components/sibooking/AppShell";
import { getStoredAuth } from "@/lib/api";

export function ProfileView({ role }: { role: "user" | "admin" | "owner" }) {
  const auth = getStoredAuth();
  const fallback = role === "user"
    ? { nama: "Jonathan Doang", email: "Jon@gmail.com", no_hp: "012345678" }
    : { nama: "Andre Hungkul", email: "Andre@gmail.com", no_hp: "123456789" };
  const user = auth?.user ?? fallback;

  return (
    <AppShell role={role}>
      <div className="w-full max-w-[1180px] px-4 py-9 sm:px-6 md:px-8">
        <h1 className="text-[38px] font-extrabold leading-none text-[#0F4C3E]">Profile</h1>
        <h2 className="mt-2 text-[32px] font-black leading-none text-[#1F2937]">{user.nama}</h2>
        <section className="mt-10 max-w-[532px] space-y-3">
          <ProfileRow label="Full Name" value={user.nama} />
          <ProfileRow label="E-mail" value={user.email} underline />
          <ProfileRow label="No.HP" value={user.no_hp} />
        </section>
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
