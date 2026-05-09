"use client";

import Image from "next/image";

import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, getStoredAuth, type Reservasi } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import { formatDate, normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

export default function UserHistoryPage() {
  const auth = getStoredAuth();
  const reservations = useApiData<Reservasi[]>(
    () => api.reservasi.list(auth?.user.id_user ? { id_user: auth.user.id_user } : undefined),
    fallbackReservations,
  );

  return (
    <AppShell role="user">
      <div className="w-full max-w-[1180px] px-4 py-9 sm:px-6 md:px-8">
        <h1 className="mb-6 text-[38px] font-extrabold leading-none text-[#0F4C3E]">History</h1>
        {reservations.error ? <ErrorState message={reservations.error} /> : null}
        {reservations.loading ? <LoadingState /> : null}
        {!reservations.loading && reservations.data.length === 0 ? <EmptyState message="History masih kosong." /> : null}
        <section className="grid max-w-[840px] grid-cols-1 gap-5 md:grid-cols-2">
          {reservations.data.map((booking) => (
            <article key={booking.id_reservasi} className="relative min-h-[222px] rounded-[12px] border border-[#CFE8DA] bg-[#EEF8F2] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.28)]">
              <h2 className="text-[24px] font-black leading-none text-[#174D3D]">
                {roomLabel(booking.tempat?.nomor_meja)} - {roomTypeFromPrice(booking.tempat?.harga)}
              </h2>
              <div className="mt-3 text-[20px] font-black leading-[1.18] text-[#008B8F]">
                <p>{booking.user?.nama ?? "Jonathan"}</p>
                <p>{booking.user?.no_hp ?? "081234567"}</p>
                <p>{formatDate(booking.tanggal).replace(" ", ", ")}</p>
                <p>
                  {normalizeTime(booking.jadwal?.jam_mulai)} - {normalizeTime(booking.jadwal?.jam_selesai)}
                </p>
              </div>
              <Image src="/billiard-ball(Dashboard User).png" alt="" width={115} height={115} className="absolute right-8 top-12 h-[92px] w-[92px] object-contain md:h-[115px] md:w-[115px]" />
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
