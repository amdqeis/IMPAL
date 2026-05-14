"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { ReservationCard } from "@/components/user/ReservationCard";
import { api, clearAuth, type Reservasi } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { getBookingActionLabel, getBookingTargetUrl, getLatestPaymentStatus, isPaymentPaid, shouldOpenPayment } from "@/lib/booking-routing";
import { formatCurrency, normalizeTime } from "@/lib/format";

export default function UserBookingDetailPage() {
  return (
    <AppShell role="user">
      <UserBookingDetailContent />
    </AppShell>
  );
}

function UserBookingDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reservationId = Number(params.id);
  const invalidReservationId = !Number.isFinite(reservationId) || reservationId <= 0;
  const [reservation, setReservation] = useState<Reservasi | null>(null);
  const [loading, setLoading] = useState(!invalidReservationId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidReservationId) {
      return;
    }

    const controller = new AbortController();
    api.reservasi
      .get(reservationId, { signal: controller.signal })
      .then(setReservation)
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isUnauthorizedError(err)) {
          clearAuth();
          router.replace("/login");
          return;
        }
        setError(getApiErrorMessage(err, "Gagal memuat detail booking."));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [invalidReservationId, reservationId, router]);

  const paymentStatus = reservation ? getLatestPaymentStatus(reservation) : "";
  const errorMessage = invalidReservationId ? "ID booking tidak valid." : error;
  const primaryHref = useMemo(() => {
    if (!reservation) {
      return null;
    }
    if (shouldOpenPayment(reservation)) {
      return `/user/booking/${reservation.id_reservasi}/payment`;
    }
    if (isPaymentPaid(paymentStatus) && reservation.latest_payment_id) {
      return `/user/payment/completed?id_reservasi=${reservation.id_reservasi}&id_payment=${reservation.latest_payment_id}`;
    }
    return null;
  }, [paymentStatus, reservation]);

  return (
    <div className="w-full max-w-[1180px] px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#6A9484]">Detail Booking</p>
          <h1 className="mt-1 text-[36px] font-extrabold leading-none text-[#0F4C3E]">Booking #{reservationId || "-"}</h1>
        </div>
        <Link href="/user/booking" className="rounded-[8px] border border-[#BFD9CB] bg-white px-4 py-2 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3]">
          Back
        </Link>
      </div>

      {loading && !invalidReservationId ? <LoadingState label="Memuat detail booking..." /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!loading && !errorMessage && !reservation ? <EmptyState message="Booking tidak ditemukan." /> : null}

      {reservation ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <ReservationCard
            reservation={reservation}
            paymentStatus={reservation.latest_payment_status}
            showPaymentStatus
            href={getBookingTargetUrl(reservation)}
            actionLabel={getBookingActionLabel(reservation)}
          />
          <section className="rounded-[12px] border border-[#D9EBDD] bg-white/85 p-5 shadow-[0_8px_18px_rgba(23,77,61,0.08)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailLine label="Status Reservasi" value={reservation.status} />
              <DetailLine label="Status Pembayaran" value={paymentStatus || "unpaid"} />
              <DetailLine label="Tanggal" value={String(reservation.tanggal)} />
              <DetailLine label="Jam" value={`${normalizeTime(reservation.jadwal?.jam_mulai)} - ${normalizeTime(reservation.jadwal?.jam_selesai)}`} />
              <DetailLine label="Total" value={formatCurrency(reservation.total_harga)} />
              <DetailLine label="ID Payment Terakhir" value={reservation.latest_payment_id ? `#${reservation.latest_payment_id}` : "-"} />
            </div>
            {primaryHref ? (
              <Link href={primaryHref} className="mt-6 inline-flex rounded-[8px] bg-[#F5A400] px-5 py-2 text-[15px] font-black text-[#073B31] shadow-[0_4px_8px_rgba(0,0,0,0.18)] transition hover:bg-[#FFB21A]">
                {shouldOpenPayment(reservation) ? "Lanjut Pembayaran" : "Lihat Status Pembayaran"}
              </Link>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#F6FBF8] px-4 py-3">
      <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#6A9484]">{label}</p>
      <p className="mt-1 break-words text-[18px] font-black text-[#174D3D]">{value}</p>
    </div>
  );
}
