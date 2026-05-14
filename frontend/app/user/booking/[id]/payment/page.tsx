"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import { ReservationCard } from "@/components/user/ReservationCard";
import { QrisPanel } from "@/components/user/payment/PaymentMethod";
import { api, clearAuth, type Pembayaran, type Reservasi } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { getBookingActionLabel, getLatestPaymentStatus, isPaymentPaid, isReservationBlockedForPayment } from "@/lib/booking-routing";
import { formatCurrency } from "@/lib/format";
import { invalidateBranchResourceCache } from "@/lib/use-branch-resource-cache";

export default function UserBookingPaymentPage() {
  return (
    <AppShell role="user">
      <UserBookingPaymentContent />
    </AppShell>
  );
}

function UserBookingPaymentContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const reservationId = Number(params.id);
  const [reservation, setReservation] = useState<Reservasi | null>(null);
  const [payment, setPayment] = useState<Pembayaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isRefreshingPayment, setIsRefreshingPayment] = useState(false);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (isUnauthorizedError(err)) {
        clearAuth();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  const loadReservationPayment = useCallback(async () => {
    if (!Number.isFinite(reservationId) || reservationId <= 0) {
      setError("ID booking tidak valid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [detail, payments] = await Promise.all([
        api.reservasi.get(reservationId),
        api.pembayaran.list({
          id_reservasi: reservationId,
          limit: 1,
          sort_by: "id_payment",
          sort_order: "desc",
        }),
      ]);
      const latestPayment = payments[0] ?? null;
      setReservation(detail);
      setPayment(latestPayment);

      if (latestPayment && isPaymentPaid(latestPayment.status)) {
        router.replace(`/user/payment/completed?id_reservasi=${reservationId}&id_payment=${latestPayment.id_payment}`);
      }
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(getApiErrorMessage(err, "Gagal memuat pembayaran booking."));
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, reservationId, router]);

  useEffect(() => {
    void loadReservationPayment();
  }, [loadReservationPayment]);

  const createPayment = async () => {
    if (!reservation || isReservationBlockedForPayment(reservation)) {
      return;
    }

    setIsCreatingPayment(true);
    setError(null);
    try {
      const createdPayment = await api.pembayaran.create({
        id_reservasi: reservation.id_reservasi,
        amount: reservation.total_harga,
        status: "pending",
      });
      setPayment(createdPayment);
      storeLatestIds(reservation.id_reservasi, createdPayment.id_payment);
      toast.success("Payment berhasil dibuat. Silakan lanjut QRIS dummy.");
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(getApiErrorMessage(err, "Gagal membuat payment untuk booking ini."));
      }
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const refreshPaymentStatus = async () => {
    setIsRefreshingPayment(true);
    setError(null);
    try {
      const payments = await api.pembayaran.list({
        id_reservasi: reservationId,
        limit: 1,
        sort_by: "id_payment",
        sort_order: "desc",
      });
      const latestPayment = payments[0] ?? null;
      setPayment(latestPayment);
      if (!latestPayment) {
        setError("Payment untuk booking ini belum ditemukan.");
      } else if (isPaymentPaid(latestPayment.status)) {
        storeLatestIds(reservationId, latestPayment.id_payment);
        router.push(`/user/payment/completed?id_reservasi=${reservationId}&id_payment=${latestPayment.id_payment}`);
      } else {
        toast.info("Pembayaran masih menunggu konfirmasi.");
      }
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(getApiErrorMessage(err, "Gagal mengecek status pembayaran."));
      }
    } finally {
      setIsRefreshingPayment(false);
    }
  };

  const dummyConfirmPayment = async () => {
    if (!payment) {
      return;
    }

    setIsConfirmingPayment(true);
    setError(null);
    try {
      const confirmed = await api.pembayaran.dummyConfirm(payment.id_payment);
      setPayment(confirmed);
      storeLatestIds(confirmed.id_reservasi, confirmed.id_payment);
      invalidateUserCaches(reservation);
      toast.success("Pembayaran dummy berhasil dikonfirmasi.");
      router.push(`/user/payment/completed?id_reservasi=${confirmed.id_reservasi}&id_payment=${confirmed.id_payment}`);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(getApiErrorMessage(err, "Gagal mengonfirmasi pembayaran dummy."));
      }
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const blocked = reservation ? isReservationBlockedForPayment(reservation) : false;

  return (
    <div className="w-full max-w-[1180px] px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#6A9484]">Payment Booking</p>
          <h1 className="mt-1 text-[36px] font-extrabold leading-none text-[#0F4C3E]">Booking #{reservationId || "-"}</h1>
        </div>
        <Link href={`/user/booking/${reservationId}`} className="rounded-[8px] border border-[#BFD9CB] bg-white px-4 py-2 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3]">
          Detail
        </Link>
      </div>

      {loading ? <LoadingState label="Memuat payment booking..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && !reservation ? <EmptyState message="Booking tidak ditemukan." /> : null}

      {reservation ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <ReservationCard
              reservation={reservation}
              paymentStatus={getLatestPaymentStatus(reservation)}
              showPaymentStatus
              actionLabel={getBookingActionLabel(reservation)}
            />
            <section className="rounded-[10px] border border-[#D9EBDD] bg-white/85 p-4">
              <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#6A9484]">Total</p>
              <p className="mt-1 text-[28px] font-black text-[#174D3D]">{formatCurrency(reservation.total_harga)}</p>
              <p className="mt-2 text-[13px] font-bold text-[#64748B]">
                Status reservasi: {reservation.status}. Payment: {(payment?.status ?? getLatestPaymentStatus(reservation)) || "unpaid"}.
              </p>
            </section>
          </div>

          <div>
            {blocked ? (
              <section className="rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] p-5">
                <h2 className="text-[22px] font-black text-[#B91C1C]">Booking tidak dapat dibayar</h2>
                <p className="mt-2 text-[14px] font-bold text-[#7F1D1D]">
                  Status booking ini adalah {reservation.status}. Silakan lihat detail booking untuk informasi lengkap.
                </p>
              </section>
            ) : payment ? (
              <QrisPanel
                payment={payment}
                isConfirmingPayment={isConfirmingPayment}
                isRefreshingPayment={isRefreshingPayment}
                onDummyConfirm={dummyConfirmPayment}
                onRefreshStatus={refreshPaymentStatus}
              />
            ) : (
              <section className="flex min-h-[260px] flex-col items-center justify-center rounded-[10px] border border-[#D9EBDD] bg-white/85 p-6 text-center">
                <h2 className="text-[24px] font-black text-[#174D3D]">Payment belum dibuat</h2>
                <p className="mt-2 max-w-[420px] text-[14px] font-bold text-[#64748B]">
                  Buat payment untuk booking ini tanpa membuat reservasi baru.
                </p>
                <button
                  type="button"
                  onClick={createPayment}
                  disabled={isCreatingPayment}
                  className="mt-5 rounded-[8px] bg-[#F5A400] px-5 py-2 text-[15px] font-black text-[#073B31] shadow-[0_4px_8px_rgba(0,0,0,0.18)] transition hover:bg-[#FFB21A] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingPayment ? "Membuat Payment..." : "Buat Payment"}
                </button>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function storeLatestIds(reservationId: number, paymentId: number) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem("sibooking_latest_reservation", String(reservationId));
  window.sessionStorage.setItem("sibooking_latest_payment", String(paymentId));
}

function invalidateUserCaches(reservation: Reservasi | null) {
  const branchId = reservation?.tempat?.id_cabang ?? null;
  invalidateBranchResourceCache("user-active-bookings", branchId);
  invalidateBranchResourceCache("user-history", branchId);
  invalidateBranchResourceCache("user-dashboard", branchId);
  invalidateBranchResourceCache("user-payment-availability", reservation?.id_tempat ?? null);
}
