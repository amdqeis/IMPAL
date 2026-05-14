"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, clearAuth, type Pembayaran } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";

export default function BookingCompletedPage() {
  return (
    <Suspense fallback={<CompletedShell><LoadingState label="Memeriksa pembayaran..." /></CompletedShell>}>
      <BookingCompletedContent />
    </Suspense>
  );
}

function BookingCompletedContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [payment, setPayment] = useState<Pembayaran | null>(null);
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayment = useCallback(async () => {
    const reservasiId = readNumericParam(params.get("id_reservasi")) ?? readStoredId("sibooking_latest_reservation");
    setReservationId(reservasiId);

    if (!reservasiId) {
      setPayment(null);
      setError("ID reservasi tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payments = await api.pembayaran.list({
        id_reservasi: reservasiId,
        limit: 1,
        sort_by: "id_payment",
        sort_order: "desc",
      });
      setPayment(payments[0] ?? null);
      if (payments.length === 0) {
        setError("Payment untuk reservasi ini belum ditemukan.");
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAuth();
        router.replace("/login");
        return;
      }

      setError(getApiErrorMessage(err, "Gagal memeriksa status pembayaran."));
    } finally {
      setLoading(false);
    }
  }, [params, router]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  const isPaid = payment?.status.toLowerCase() === "paid";

  if (loading) {
    return (
      <CompletedShell>
        <LoadingState label="Memeriksa pembayaran..." />
      </CompletedShell>
    );
  }

  if (!isPaid) {
    return (
      <CompletedShell>
        <section className="relative z-10 flex w-full max-w-[620px] flex-col items-center px-6">
          <h1 className="text-center text-[48px] font-black leading-none text-[#0F4C3E] drop-shadow-[0_7px_6px_rgba(15,76,62,0.22)]">
            Payment Pending
          </h1>
          <div className="mt-6 w-full rounded-[8px] border border-[#D9D9D9] bg-white px-4 py-4 text-center text-[18px] font-black text-[#64748B]">
            {payment ? `Payment #${payment.id_payment} - ${payment.status.toUpperCase()}` : `Reservasi #${reservationId ?? "-"}`}
          </div>
          {error ? <div className="mt-4 w-full"><ErrorState message={error} /></div> : null}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadPayment()}
              className="rounded-[8px] bg-[#005344] px-4 py-2 text-[16px] font-black text-white shadow-[0_4px_6px_rgba(0,0,0,0.28)]"
            >
              Refresh Status
            </button>
            <Link
              href="/user/booking"
              className="rounded-[8px] border border-[#005344] bg-white px-4 py-2 text-[16px] font-black text-[#005344]"
            >
              Booking
            </Link>
          </div>
        </section>
      </CompletedShell>
    );
  }

  return (
    <CompletedShell>
      <section className="relative z-10 flex w-full max-w-[620px] flex-col items-center px-6">
        <h1 className="text-center text-[54px] font-black leading-none text-[#0F4C3E] drop-shadow-[0_7px_6px_rgba(15,76,62,0.28)]">
          Booking Completed!
        </h1>
        <div className="mt-6 h-[50px] w-full rounded-[8px] border border-[#D9D9D9] bg-white px-4 py-2 text-[24px] font-black text-[#C4C4C4]">
          #{reservationId ?? payment.id_reservasi}
        </div>
        <Link
          href="/user/dashboard"
          className="mt-3 rounded-[8px] border-2 border-[#0F4C3E] bg-white px-4 py-2 text-[18px] font-black text-[#0F4C3E] shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition-all duration-200 hover:bg-[#EAF7F2]"
        >
          Dashboard
        </Link>
      </section>
    </CompletedShell>
  );
}

function CompletedShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EFFBF6] text-[#0F4C3E]">
      <div className="absolute inset-0 opacity-[0.18]">
        <div className="absolute right-[-40px] top-[-20px] h-[840px] w-[300px] rounded-[36px] border-[16px] border-[#5E6964]" />
        <div className="absolute right-[290px] top-[155px] h-[620px] w-[46px] rounded-full border-[16px] border-[#5E6964]" />
      </div>
      {children}
    </main>
  );
}

function readNumericParam(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readStoredId(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return readNumericParam(window.sessionStorage.getItem(key));
}
