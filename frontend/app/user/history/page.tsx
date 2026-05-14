"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { ReservationCard } from "@/components/user/ReservationCard";
import { api, clearAuth, type PaginatedResponse, type PaginationMeta, type Reservasi } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

const ITEMS_PER_PAGE = 6;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
};

export default function UserHistoryPage() {
  return (
    <AppShell role="user">
      <UserHistoryContent />
    </AppShell>
  );
}

function UserHistoryContent() {
  const router = useRouter();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const branchId = selectedBranch?.id_cabang ?? null;
  const [pageState, setPageState] = useState<{ branchId: number | null; page: number }>({
    branchId: null,
    page: 1,
  });
  const page = pageState.branchId === branchId ? pageState.page : 1;
  const fetchHistory = useCallback(
    (signal: AbortSignal) => {
      if (!branchId) {
        return Promise.resolve(createEmptyPaginatedResponse<Reservasi>());
      }

      return api.reservasi.listPaginated(
        {
          id_cabang: branchId,
          page,
          limit: ITEMS_PER_PAGE,
          sort_by: "tanggal",
          sort_order: "desc",
        },
        { signal },
      );
    },
    [branchId, page],
  );
  const history = useBranchResourceCache<PaginatedResponse<Reservasi>>({
    resource: "user-history",
    branchId,
    cacheParts: ["reservations", page],
    enabled: Boolean(branchId),
    fetcher: fetchHistory,
  });
  const response = history.data ?? createEmptyPaginatedResponse<Reservasi>(page);
  const reservations = response.data;
  const pagination = response.pagination;
  const totalPages = Math.max(1, pagination.total_pages || 1);
  const errorMessage = history.error
    ? getApiErrorMessage(history.error, "Gagal memuat history.", "Kamu tidak punya akses melihat history.")
    : null;

  useEffect(() => {
    if (isUnauthorizedError(history.error)) {
      clearAuth();
      router.replace("/login");
    }
  }, [history.error, router]);

  return (
    <div className="w-full max-w-[1180px] px-4 py-9 sm:px-6 md:px-8">
      <h1 className="mb-6 text-[38px] font-extrabold leading-none text-[#0F4C3E]">History</h1>

      {branchesError ? (
        <ErrorState message={branchesError} />
      ) : branchesLoading ? (
        <LoadingState label="Memuat cabang..." />
      ) : !selectedBranch ? (
        <EmptyState message="Belum ada cabang yang dapat ditampilkan." />
      ) : (
        <>
          {errorMessage ? <ErrorState message={errorMessage} /> : null}
          {history.loading ? <LoadingState label="Memuat history..." /> : null}
          {!history.loading && reservations.length === 0 ? <EmptyState message="History masih kosong." /> : null}

          <section className="grid max-w-[840px] grid-cols-1 gap-5 md:grid-cols-2">
            {reservations.map((booking) => (
              <ReservationCard key={booking.id_reservasi} reservation={booking} />
            ))}
          </section>

          {pagination.total_items > ITEMS_PER_PAGE ? (
            <div className="mt-6 flex max-w-[840px] items-center justify-between rounded-[8px] border border-[#DCEFE4] bg-white/85 px-4 py-3 text-[14px] font-black text-[#174D3D]">
              <button
                type="button"
                onClick={() =>
                  setPageState((current) => ({
                    branchId,
                    page: Math.max(1, (current.branchId === branchId ? current.page : 1) - 1),
                  }))
                }
                disabled={!pagination.has_prev || history.loading}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] px-3 transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                Prev
              </button>
              <span>
                Page {pagination.page || page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPageState((current) => ({
                    branchId,
                    page: Math.min(totalPages, (current.branchId === branchId ? current.page : 1) + 1),
                  }))
                }
                disabled={!pagination.has_next || history.loading}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] px-3 transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4 stroke-[3]" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function createEmptyPaginatedResponse<T>(page = 1): PaginatedResponse<T> {
  return {
    data: [],
    pagination: {
      ...EMPTY_PAGINATION,
      page,
    },
  };
}
