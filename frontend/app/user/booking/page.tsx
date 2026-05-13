"use client";

import Image from "next/image";

import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, getStoredAuth, type Reservasi } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import { formatDate, normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

export default function UserBookingPage() {
  const auth = getStoredAuth();
  const reservations = useApiData<Reservasi[]>(
    () => api.reservasi.list(auth?.user.id_user ? { id_user: auth.user.id_user, limit: 50 } : { limit: 50 }),
    fallbackReservations,
  );

  const activeReservations = reservations.data.filter((reservation) =>
    ["pending", "confirmed"].includes(reservation.status.toLowerCase()),
  );

  return (
    <AppShell role="user">
      <div className="w-full max-w-[1180px] px-4 py-8 sm:px-6 md:px-8">
        <h1 className="mb-7 text-[38px] font-extrabold leading-none text-[#0F4C3E]">Booking</h1>
        {reservations.error ? <ErrorState message={reservations.error} /> : null}
        {reservations.loading ? <LoadingState /> : null}
        {!reservations.loading && activeReservations.length === 0 ? <EmptyState message="Belum ada booking aktif." /> : null}
        <section className="grid max-w-[900px] grid-cols-1 gap-6 md:grid-cols-2">
          {activeReservations.map((booking) => (
            <UserBookingCard
              key={booking.id_reservasi}
              booking={booking}
              status={booking.latest_payment_status === "paid" ? "PAID" : "UNPAID"}
            />
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function UserBookingCard({ booking, status }: { booking: Reservasi; status: string }) {
  const room = booking.tempat;
  const schedule = booking.jadwal;
  return (
    <article className="relative min-h-[222px] overflow-hidden rounded-[12px] border border-[#CFE8DA] bg-[#EEF8F2] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.28)]">
      <div className="max-w-[250px]">
        <h2 className="text-[24px] font-black leading-none text-[#174D3D]">
          {roomLabel(room?.nomor_meja)} - {roomTypeFromPrice(room?.harga)}
        </h2>
        <div className="mt-3 text-[20px] font-black leading-[1.18] text-[#008B8F]">
          <p>{booking.user?.nama ?? "Jonathan"}</p>
          <p>{booking.user?.no_hp ?? "081234567"}</p>
          <p>{formatDate(booking.tanggal).replace(" ", ", ")}</p>
          <p>
            {normalizeTime(schedule?.jam_mulai)} - {normalizeTime(schedule?.jam_selesai)}
          </p>
        </div>
      </div>
      <Image src="/billiard-ball(Dashboard User).png" alt="" width={115} height={115} className="absolute right-7 top-12 h-[92px] w-[92px] object-contain md:h-[115px] md:w-[115px]" />
      <div className="absolute bottom-4 right-5 flex h-[28px] min-w-[118px] items-center justify-center rounded-[7px] border border-[#64748B] text-[18px] font-black text-[#005344]">
        {status}
      </div>
    </article>
  );
}
