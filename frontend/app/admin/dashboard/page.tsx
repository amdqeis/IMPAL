"use client";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type AdminSummary, type Reservasi } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import { formatCurrency, formatDate, normalizeTime, reservationStatusLabel, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

const fallbackSummary: AdminSummary = {
  total_bookings: 128,
  active_bookings: 8,
  paid_payments: 6,
  pending_payments: 1,
  income_total: "4800000",
};

export default function AdminDashboardPage() {
  const reservations = useApiData<Reservasi[]>(() => api.reservasi.list(), fallbackReservations);
  const summary = useApiData<AdminSummary>(() => api.laporan.summary(), fallbackSummary);

  return (
    <AppShell role="admin">
      <div className="w-full max-w-[1180px] px-4 py-5 sm:px-6 md:px-8 xl:px-10">
        <header>
          <p className="text-[12px] font-bold leading-none text-[#16A34A]">Welcomeback, Andre!</p>
          <h1 className="mt-1 text-[38px] font-extrabold leading-[40px] text-[#0F4C3E]">DASHBOARD</h1>
        </header>
        {reservations.error ? <div className="mt-4"><ErrorState message={reservations.error} /></div> : null}
        {summary.loading ? <div className="mt-4"><LoadingState /></div> : null}

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[12px] bg-[#0D3B2F] p-6 text-white shadow-[0_4px_8px_rgba(0,0,0,0.25)]">
            <p className="text-[12px] font-black uppercase text-[#A7F3D0]">Booking Terdekat</p>
            <h2 className="mt-3 text-[30px] font-black">{reservations.data[0] ? roomLabel(reservations.data[0].tempat?.nomor_meja) : "Meja VIP - 04"}</h2>
            <p className="mt-1 text-[16px] font-bold text-[#D1FAE5]">
              {reservations.data[0] ? `${formatDate(reservations.data[0].tanggal)} | ${normalizeTime(reservations.data[0].jadwal?.jam_mulai)}` : "Rabu, 11 Nov | 2 Jam"}
            </p>
            <div className="mt-8 h-3 rounded-full bg-white/20">
              <div className="h-3 w-[72%] rounded-full bg-[#2FAE9A]" />
            </div>
          </div>

          <div className="rounded-[12px] border border-[#DCEFE4] bg-[#EEF8F2] p-6 shadow-[0_4px_8px_rgba(0,0,0,0.18)]">
            <h2 className="text-[24px] font-black text-[#0F4C3E]">Overview</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat label="Bookings" value={summary.data.total_bookings} />
              <Stat label="Aktif" value={summary.data.active_bookings} />
              <Stat label="Lunas" value={summary.data.paid_payments} />
              <Stat label="Pending" value={summary.data.pending_payments} />
            </div>
            <p className="mt-5 text-[22px] font-black text-[#0F4C3E]">{formatCurrency(summary.data.income_total)}</p>
          </div>
        </section>

        <section className="mt-9">
          <h2 className="text-[18px] font-bold text-[#111827]">Bookings</h2>
          <div className="mt-3 h-[4px] w-[64px] rounded-full bg-[#F5A400]" />
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {reservations.data.slice(0, 6).map((booking, index) => (
              <article key={booking.id_reservasi} className={`h-[112px] rounded-[6px] border bg-white p-3 shadow-[0_4px_6px_rgba(0,0,0,0.28)] ${index === 0 ? "border-[#3B82F6]" : "border-transparent"}`}>
                <h3 className="text-[20px] font-black text-[#075746]">
                  {roomLabel(booking.tempat?.nomor_meja)} - {roomTypeFromPrice(booking.tempat?.harga)}
                </h3>
                <p className="mt-2 text-[14px] font-bold text-[#6B7280]">{reservationStatusLabel(booking.status)}</p>
                <p className="mt-1 text-[14px] font-bold text-[#6B7280]">
                  {normalizeTime(booking.jadwal?.jam_mulai)} - {normalizeTime(booking.jadwal?.jam_selesai)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[8px] bg-white/80 p-3">
      <p className="text-[12px] font-black uppercase text-[#6B7280]">{label}</p>
      <p className="text-[28px] font-black text-[#0F4C3E]">{value}</p>
    </div>
  );
}
