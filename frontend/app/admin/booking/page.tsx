"use client";

import { useState } from "react";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type Reservasi } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import { formatDate, normalizeTime, reservationStatusLabel, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

export default function AdminBookingPage() {
  const reservations = useApiData<Reservasi[]>(() => api.reservasi.list(), fallbackReservations);
  const [busyId, setBusyId] = useState<number | null>(null);

  const updateStatus = async (booking: Reservasi, status: string) => {
    setBusyId(booking.id_reservasi);
    reservations.setError(null);
    try {
      const updated = await api.reservasi.updateStatus(booking.id_reservasi, { status });
      reservations.setData((current) => current.map((item) => (item.id_reservasi === updated.id_reservasi ? { ...item, ...updated } : item)));
    } catch (err) {
      reservations.setError(err instanceof Error ? err.message : "Gagal memperbarui booking");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell role="admin">
      <div className="w-full max-w-[1180px] px-4 py-6 sm:px-6 md:px-8 xl:px-10">
        <h1 className="mb-8 text-[38px] font-extrabold leading-none text-[#0F4C3E]">Booking</h1>
        {reservations.error ? <ErrorState message={reservations.error} /> : null}
        {reservations.loading ? <LoadingState /> : null}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {reservations.data.concat(fallbackReservations).slice(0, 9).map((booking, index) => (
            <article key={`${booking.id_reservasi}-${index}`} className={`min-h-[202px] rounded-[6px] border bg-white p-6 shadow-[0_4px_6px_rgba(0,0,0,0.28)] ${index === 0 ? "border-[#3B82F6]" : "border-transparent"}`}>
              <h2 className="truncate text-[14px] font-black text-[#111827]">
                {roomLabel(booking.tempat?.nomor_meja)} - {roomTypeFromPrice(booking.tempat?.harga)}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5">
                <Info label="Status" value={reservationStatusLabel(booking.status)} />
                <Info label="Bayar" value={booking.status === "confirmed" ? "Lunas" : "Tagihan"} />
                <Info label="Date" value={formatDate(booking.tanggal)} />
                <Info label="Time" value={`${normalizeTime(booking.jadwal?.jam_mulai)} - ${normalizeTime(booking.jadwal?.jam_selesai)}`} />
              </div>
              <div className="mt-4 flex gap-10 border-t border-[#E5E7EB] pt-4">
                <button disabled={busyId === booking.id_reservasi} onClick={() => updateStatus(booking, "confirmed")} className="text-[14px] font-black text-[#6C4AB6] disabled:opacity-50">
                  Accept Booking
                </button>
                <button disabled={busyId === booking.id_reservasi} onClick={() => updateStatus(booking, "declined")} className="text-[14px] font-black text-[#CBD5E1] disabled:opacity-50">
                  Decline
                </button>
              </div>
            </article>
          ))}
        </section>
        <div className="mt-4 flex justify-end">
          <div className="flex overflow-hidden rounded-full border border-black bg-white text-[20px]">
            {["‹", "1", "2", "3", "4", "››", "›"].map((item, index) => (
              <button key={`${item}-${index}`} className={`h-11 min-w-10 border-l border-black px-3 first:border-l-0 ${item === "2" ? "font-black" : ""}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-[#94A3B8]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-medium text-[#334155]">{value}</p>
    </div>
  );
}
