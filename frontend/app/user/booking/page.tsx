"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { BookingCard } from "@/components/user/booking/BookingCard";
import { api, clearAuth, type Reservasi } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

export default function UserBookingPage() {
  return (
    <AppShell role="user">
      <UserBookingContent />
    </AppShell>
  );
}

function UserBookingContent() {
  const router = useRouter();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const branchId = selectedBranch?.id_cabang ?? null;
  const fetchActiveReservations = useCallback(
    async (signal: AbortSignal) => {
      if (!branchId) {
        return [];
      }

      const [pending, confirmed] = await Promise.all([
        api.reservasi.list(
          {
            id_cabang: branchId,
            status_reservasi: "pending",
            limit: 20,
            sort_by: "tanggal",
            sort_order: "asc",
          },
          { signal },
        ),
        api.reservasi.list(
          {
            id_cabang: branchId,
            status_reservasi: "confirmed",
            limit: 20,
            sort_by: "tanggal",
            sort_order: "asc",
          },
          { signal },
        ),
      ]);

      return [...pending, ...confirmed];
    },
    [branchId],
  );
  const reservations = useBranchResourceCache<Reservasi[]>({
    resource: "user-active-bookings",
    branchId,
    cacheParts: ["pending-confirmed"],
    enabled: Boolean(branchId),
    fetcher: fetchActiveReservations,
  });

  useEffect(() => {
    if (isUnauthorizedError(reservations.error)) {
      clearAuth();
      router.replace("/login");
    }
  }, [reservations.error, router]);

  const activeReservations = useMemo(
    () =>
      [...(reservations.data ?? [])].sort((a, b) => {
        const dateCompare = String(a.tanggal).localeCompare(String(b.tanggal));
        return dateCompare || a.id_reservasi - b.id_reservasi;
      }),
    [reservations.data],
  );
  const errorMessage = reservations.error
    ? getApiErrorMessage(reservations.error, "Gagal memuat booking aktif.", "Kamu tidak punya akses melihat booking.")
    : null;

  return (
    <div className="w-full max-w-[1180px] px-4 py-8 sm:px-6 md:px-8">
      <h1 className="mb-7 text-[38px] font-extrabold leading-none text-[#0F4C3E]">Booking</h1>

      {branchesError ? (
        <ErrorState message={branchesError} />
      ) : branchesLoading ? (
        <LoadingState label="Memuat cabang..." />
      ) : !selectedBranch ? (
        <EmptyState message="Belum ada cabang yang dapat ditampilkan." />
      ) : (
        <>
          {errorMessage ? <ErrorState message={errorMessage} /> : null}
          {reservations.loading ? <LoadingState label="Memuat booking aktif..." /> : null}
          {!reservations.loading && activeReservations.length === 0 ? (
            <EmptyState message="Belum ada booking aktif." />
          ) : null}

          <section className="grid max-w-[900px] grid-cols-1 gap-6 md:grid-cols-2">
            {activeReservations.map((booking) => (
              <BookingCard
                key={booking.id_reservasi}
                booking={booking}
                paymentStatus={booking.latest_payment_status}
                showPaymentStatus
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
