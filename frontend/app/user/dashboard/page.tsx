"use client";

import Link from "next/link";
import { Fan, ShieldCheck, Snowflake, Sofa, Table2, Tv, UsersRound } from "lucide-react";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type Jadwal, type Tempat } from "@/lib/api";
import { fallbackSchedules, fallbackTables } from "@/lib/fallback-data";
import { formatCurrency, normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

export default function UserDashboardPage() {
  const tables = useApiData<Tempat[]>(() => api.masterData.listTempat(), fallbackTables);
  const schedules = useApiData<Jadwal[]>(() => api.jadwal.listTersedia(), fallbackSchedules);

  const scheduleFor = (id: number) => schedules.data.find((schedule) => schedule.id_tempat === id);

  return (
    <AppShell role="user">
      <div className="w-full max-w-[1180px] px-4 py-5 sm:px-6 md:px-8">
        <header>
          <p className="text-[12px] font-bold leading-none text-[#16A34A]">Welcomeback, Jonathan!</p>
          <h1 className="mt-1 text-[38px] font-extrabold leading-[40px] tracking-normal text-[#0F4C3E] sm:text-[46px] sm:leading-[48px] lg:text-[36px] lg:leading-[38px]">
            DASHBOARD
          </h1>
        </header>

        {tables.error ? <div className="mt-4"><ErrorState message={tables.error} /></div> : null}

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <FeatureCard
            title="Regular Room"
            price="IDR 35.000/hr"
            facilities={[
              { label: "Social Area", icon: UsersRound },
              { label: "Fan Cooled", icon: Fan },
              { label: "12 Tables Ready", icon: Table2 },
            ]}
          />
          <FeatureCard
            title="VIP Room"
            price="IDR 75.000/hr"
            badge="LIMITED"
            facilities={[
              { label: "Full AC", icon: Snowflake },
              { label: "Sofa Seats", icon: Sofa },
              { label: "Smart TV", icon: Tv },
              { label: "Private Area", icon: ShieldCheck },
            ]}
          />
        </section>

        <section className="mt-9">
          <div className="mb-5">
            <h2 className="text-[18px] font-bold leading-none text-[#111827]">Rooms</h2>
            <div className="mt-3 h-[4px] w-[64px] rounded-full bg-[#F5A400]" />
          </div>
          {tables.loading ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {tables.data.map((table, index) => {
                const schedule = scheduleFor(table.id_tempat);
                const type = roomTypeFromPrice(table.harga);
                const available = table.status.toLowerCase() === "available";
                return (
                  <article
                    key={table.id_tempat}
                    className={`relative h-[112px] rounded-[6px] border bg-white p-3 shadow-[0_4px_6px_rgba(0,0,0,0.28)] ${
                      index === 0 ? "border-[#3B82F6]" : "border-transparent"
                    }`}
                  >
                    <h3 className="truncate text-[22px] font-extrabold leading-none text-[#075746]">
                      {roomLabel(table.nomor_meja)} - {type}
                    </h3>
                    <div className="mt-2 flex gap-8 text-[14px] font-bold text-[#6B7280]">
                      <span>{type === "VIP" ? "8" : "5"} Tables</span>
                      <span>
                        {normalizeTime(schedule?.jam_mulai)} - {normalizeTime(schedule?.jam_selesai)}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] font-bold text-[#6B7280]">{formatCurrency(table.harga)}/hr</p>
                    {available ? (
                      <Link
                        href={`/user/payment?id_tempat=${table.id_tempat}&id_jadwal=${schedule?.id_jadwal ?? ""}`}
                        className="absolute bottom-3 right-3 rounded-[8px] border border-[#64748B] bg-[#ECFDF5] px-3 py-1 text-[12px] font-black text-[#005344]"
                      >
                        AVAILABLE
                      </Link>
                    ) : (
                      <span className="absolute bottom-3 right-3 rounded-[8px] border border-[#F87171] bg-[#FFF1F2] px-3 py-1 text-[12px] font-black text-[#DC2626]">
                        OCCUPIED
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function FeatureCard({
  title,
  price,
  facilities,
  badge,
}: {
  title: string;
  price: string;
  facilities: { label: string; icon: typeof UsersRound }[];
  badge?: string;
}) {
  return (
    <article className="relative min-h-[222px] rounded-[12px] border border-[#CFE8DA] bg-[#EEF8F2] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.28)]">
      <h2 className="text-[24px] font-extrabold leading-none text-[#174D3D]">{title}</h2>
      {badge ? (
        <span className="absolute right-6 top-4 rounded-[8px] bg-[#FFF4E8] px-4 py-2 text-[18px] font-black text-[#DC2626] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          {badge}
        </span>
      ) : null}
      <div className="mt-8 flex items-center justify-around gap-4">
        {facilities.map((facility) => {
          const Icon = facility.icon;
          return (
            <div key={facility.label} className="flex flex-col items-center text-center">
              <Icon className="h-10 w-10 stroke-[2.6] text-[#098F90]" />
              <span className="mt-2 text-[14px] font-extrabold text-[#078180]">{facility.label}</span>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-6 left-4 right-6 flex items-end justify-between">
        <p className="text-[24px] font-black text-[#065948]">{price}</p>
        <Link href="/user/payment" className="rounded-[8px] bg-[#005344] px-3 py-1.5 text-[18px] font-black text-white shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
          BOOK NOW
        </Link>
      </div>
    </article>
  );
}
