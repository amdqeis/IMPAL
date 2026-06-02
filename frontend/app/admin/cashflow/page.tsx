"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import { ApiError, api, clearAuth, type PaginatedResponse, type PaginationMeta, type Pembayaran } from "@/lib/api";
import { formatCurrency, formatDate, roomLabel } from "@/lib/format";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

type TransactionRow = {
  id: number;
  payment: Pembayaran;
  dateIso: string;
  dateLabel: string;
  description: string;
  typeLabel: string;
  status: string;
  amount: number;
  amountLabel: string;
  customerName: string;
  roomName: string;
  searchText: string;
};

type FilterState = {
  fromDate: string;
  toDate: string;
  status: string;
};

const ITEMS_PER_PAGE = 8;
const EMPTY_PAYMENTS: Pembayaran[] = [];
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
};
const emptyFilters: FilterState = {
  fromDate: "",
  toDate: "",
  status: "all",
};

export default function AdminCashflowPage() {
  return (
    <AppShell role="admin">
      <AdminCashflowContent />
    </AppShell>
  );
}

function AdminCashflowContent() {
  const router = useRouter();
  const toast = useToast();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
  const [pageState, setPageState] = useState<{ branchId: number | null; page: number }>({
    branchId: null,
    page: 1,
  });

  const handleApiError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearAuth();
          router.replace("/admin/login");
          return "Sesi berakhir. Silakan login kembali.";
        }

        if (err.status === 403) {
          return "Kamu tidak punya akses untuk melihat cashflow.";
        }

        if (err.status === 404) {
          return "Data transaksi tidak ditemukan.";
        }

        return err.message || fallbackMessage;
      }

      return err instanceof Error ? err.message : fallbackMessage;
    },
    [router],
  );

  const branchId = selectedBranch?.id_cabang ?? null;
  const requestedPage = pageState.branchId === branchId ? pageState.page : 1;
  const statusQuery = filters.status === "all" ? undefined : filters.status;
  const fetchBranchPayments = useCallback(
    (signal: AbortSignal) =>
      branchId
        ? api.pembayaran.listPaginated(
            {
              page: requestedPage,
              limit: ITEMS_PER_PAGE,
              id_cabang: branchId,
              status_pembayaran: statusQuery,
              start_date: filters.fromDate || undefined,
              end_date: filters.toDate || undefined,
              search: debouncedSearchQuery || undefined,
            },
            { signal },
          )
        : Promise.resolve(createEmptyPaginatedResponse<Pembayaran>()),
    [branchId, debouncedSearchQuery, filters.fromDate, filters.toDate, requestedPage, statusQuery],
  );
  const branchPayments = useBranchResourceCache<PaginatedResponse<Pembayaran>>({
    resource: "admin-cashflow",
    branchId,
    cacheParts: ["status", statusQuery ?? "all", filters.fromDate, filters.toDate, debouncedSearchQuery, requestedPage, ITEMS_PER_PAGE],
    enabled: Boolean(branchId),
    fetcher: fetchBranchPayments,
  });

  useEffect(() => {
    if (!branchPayments.error) {
      return;
    }

    toast.error(handleApiError(branchPayments.error, "Gagal memuat data cashflow."));
  }, [branchPayments.error, handleApiError, toast]);

  const paymentResponse = branchPayments.data ?? createEmptyPaginatedResponse<Pembayaran>(requestedPage);
  const payments = paymentResponse.data ?? EMPTY_PAYMENTS;
  const pagination = paymentResponse.pagination;
  const rows = useMemo(() => toTransactionRows(payments), [payments]);
  const visibleRows = useMemo(
    () => filterRows(rows, filters, debouncedSearchQuery),
    [debouncedSearchQuery, filters, rows],
  );
  const income = useMemo(
    () =>
      rows
        .filter((row) => row.status === "paid")
        .reduce((sum, row) => sum + row.amount, 0),
    [rows],
  );
  const paidCount = rows.filter((row) => row.status === "paid").length;
  const totalPages = Math.max(1, pagination.total_pages || 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedRows = visibleRows;

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPageState({ branchId, page: 1 });
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setSearchQuery("");
    setPageState({ branchId, page: 1 });
    toast.info("Filter cashflow direset.");
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPageState({ branchId, page: 1 });
  };

  const errorMessage = branchPayments.error
    ? getCashflowErrorMessage(branchPayments.error, "Gagal memuat data cashflow.")
    : null;

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6">
      <section className="overflow-hidden rounded-[12px] bg-[#0E3A2E] shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
        <div className="min-h-[295px] p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[34px] font-black leading-none sm:text-[38px]">Cashflow</h1>
              <p className="mt-4 text-[16px] font-bold text-[#CBD5E1]">
                Overview transaksi {selectedBranch ? selectedBranch.nama : "per cabang"}
              </p>
            </div>
          </div>

          <div className="mt-12 flex w-full max-w-[380px] flex-col gap-4 rounded-[10px] bg-[#EEFFF4] p-5 text-[#4B5563] sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex min-w-0 items-center gap-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#BBF7D0]">
                <ArrowUpRight className="h-7 w-7 text-[#16A34A]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-black">Income</p>
                <p className="mt-2 truncate text-[22px] font-black text-[#17C653]">
                  + {formatCurrency(income)}
                </p>
              </div>
            </div>
            <p className="text-[16px] font-black text-[#17C653]">+{paidCount} trx</p>
          </div>
        </div>

        <div className="bg-[#E5E7EB] p-5 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[20px] font-black text-[#1F2937]">Recent Transactions</h2>
            <button
              type="button"
              onClick={() => void branchPayments.refetch("foreground")}
              disabled={!selectedBranch || branchPayments.loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#BFD9CB] bg-white px-3 text-[13px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${branchPayments.refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>

          {branchesError ? (
            <div className="mt-4">
              <ErrorState message={branchesError} />
            </div>
          ) : branchesLoading ? (
            <div className="mt-4">
              <LoadingState label="Memuat daftar cabang..." />
            </div>
          ) : !selectedBranch ? (
            <div className="mt-4">
              <EmptyState message="Pilih cabang terlebih dahulu untuk melihat data." />
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] bg-[#F1F5F9] p-2">
                <span className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-white px-3 text-[13px] font-black text-[#174D3D]">
                  <MapPin className="h-4 w-4 fill-[#174D3D] text-[#174D3D]" aria-hidden="true" />
                  {selectedBranch.nama}
                </span>
                <label className="min-w-[150px] flex-1 sm:flex-none">
                  <span className="sr-only">From</span>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(event) => updateFilter("fromDate", event.target.value)}
                    className="h-10 w-full rounded-[8px] border border-transparent bg-white px-3 text-[14px] font-black text-[#1F2937] outline-none focus:border-[#174D3D]"
                  />
                </label>
                <label className="min-w-[150px] flex-1 sm:flex-none">
                  <span className="sr-only">To</span>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(event) => updateFilter("toDate", event.target.value)}
                    className="h-10 w-full rounded-[8px] border border-transparent bg-white px-3 text-[14px] font-black text-[#1F2937] outline-none focus:border-[#174D3D]"
                  />
                </label>
                <select
                  value={filters.status}
                  onChange={(event) => updateFilter("status", event.target.value)}
                  className="h-10 min-w-[130px] rounded-[8px] border border-transparent bg-white px-3 text-[14px] font-black text-[#1F2937] outline-none focus:border-[#174D3D]"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="refunded">Refunded</option>
                </select>
                <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-[10px] border border-[#1F2937] bg-white px-3">
                  <Search className="h-5 w-5 text-[#B6C1D0]" aria-hidden="true" />
                  <input
                    value={searchQuery}
                    onChange={(event) => updateSearchQuery(event.target.value)}
                    className="min-w-0 flex-1 text-[14px] font-bold outline-none placeholder:text-[#B6C1D0]"
                    placeholder="Search Transaction..."
                  />
                </label>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#FECACA] bg-[#FFF7F7] px-3 text-[13px] font-black text-[#B91C1C] transition hover:bg-[#FEE2E2]"
                >
                  <FilterX className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                  Reset
                </button>
              </div>

              {branchPayments.refreshing && !branchPayments.loading ? (
                <p className="mt-3 text-[13px] font-bold text-[#6A9484]">Menyegarkan cache transaksi...</p>
              ) : null}
              {errorMessage ? (
                <div className="mt-4">
                  <ErrorState message={errorMessage} />
                </div>
              ) : null}
              {branchPayments.loading ? (
                <div className="mt-4">
                  <LoadingState label="Memuat transaksi cabang..." />
                </div>
              ) : paginatedRows.length > 0 ? (
                <>
                  <div className="mt-3 overflow-x-auto rounded-[8px] bg-white/70 p-4">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="text-[16px] font-black text-[#6B7280]">
                        <tr>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Description</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((transaction) => (
                          <tr key={transaction.id} className="border-t border-black text-[17px] font-black text-[#1F2937]">
                            <td className="py-3 text-[#6B7280]">{transaction.dateLabel}</td>
                            <td className="py-3">
                              <p>{transaction.description}</p>
                              <p className="mt-1 text-[12px] font-bold text-[#6B7280]">
                                #{transaction.id} | {transaction.customerName}
                              </p>
                            </td>
                            <td className="py-3">
                              <TransactionTypeBadge transaction={transaction} />
                            </td>
                            <td className={`py-3 text-right ${transaction.status === "refunded" ? "text-[#6D28D9]" : transaction.status === "paid" ? "text-[#069B4F]" : "text-[#B45309]"}`}>
                              {transaction.status === "refunded" ? "- " : "+ "}
                              {transaction.amountLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={pagination.total_items}
                    onPageChange={(nextPage) => setPageState({ branchId, page: nextPage })}
                  />
                </>
              ) : (
                <div className="mt-4">
                  <EmptyState message="Belum ada transaksi yang sesuai untuk cabang ini." />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function TransactionTypeBadge({ transaction }: { transaction: TransactionRow }) {
  const isRefund = transaction.status === "refunded";
  const isPaid = transaction.status === "paid";
  const Icon = isRefund ? ArrowDownLeft : ArrowUpRight;

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1 text-[14px] font-black ${
      isPaid
        ? "bg-[#DCFCE7] text-[#166534]"
        : isRefund
          ? "bg-[#F3E8FF] text-[#6D28D9]"
          : "bg-[#FEF3C7] text-[#92400E]"
    }`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
      {transaction.typeLabel}
    </span>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-bold text-[#6B7280]">
        Menampilkan {totalItems} transaksi, halaman {currentPage} dari {totalPages}
      </p>
      <div className="flex w-full overflow-hidden rounded-full border border-[#174D3D] bg-white text-[15px] shadow-[0_10px_24px_rgba(17,48,41,0.08)] sm:w-auto">
        <PageButton label="Awal" disabled={currentPage === 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Sebelumnya" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        {getPaginationPages(currentPage, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="flex h-10 min-w-10 items-center justify-center border-l border-[#174D3D] px-3 font-black text-[#94A3B8]">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`h-10 min-w-10 border-l border-[#174D3D] px-3 font-black transition ${
                currentPage === item ? "bg-[#174D3D] text-white" : "text-[#174D3D] hover:bg-[#ECFDF3]"
              }`}
            >
              {item}
            </button>
          ),
        )}
        <PageButton label="Berikutnya" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Akhir" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  children,
  onClick,
}: {
  label: string;
  disabled: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 min-w-10 items-center justify-center border-l border-[#174D3D] px-3 text-[#174D3D] transition first:border-l-0 hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:text-[#B7C2D0] disabled:hover:bg-white"
    >
      {children}
    </button>
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

function toTransactionRows(payments: Pembayaran[]): TransactionRow[] {
  return payments.map((payment) => {
    const status = normalizeStatus(payment.status) || "unpaid";
    const roomName = roomLabel(payment.reservasi?.tempat?.nomor_meja, `Room #${payment.reservasi?.id_tempat ?? payment.id_reservasi}`);
    const customerName = payment.reservasi?.user?.nama ?? `Reservasi #${payment.id_reservasi}`;
    const dateIso = payment.reservasi?.tanggal ?? "";
    const dateLabel = dateIso ? formatDate(dateIso) : "-";
    const amount = Number(payment.amount);
    const amountLabel = formatCurrency(payment.amount);
    const description = `Sewa Meja ${roomName}`;
    const typeLabel = status === "refunded" ? "Refund" : status === "paid" ? "Income" : toTitleCase(status);

    return {
      id: payment.id_payment,
      payment,
      dateIso,
      dateLabel,
      description,
      typeLabel,
      status,
      amount: Number.isFinite(amount) ? amount : 0,
      amountLabel,
      customerName,
      roomName,
      searchText: [
        payment.id_payment,
        payment.id_reservasi,
        status,
        typeLabel,
        description,
        customerName,
        roomName,
        dateIso,
        dateLabel,
        amountLabel,
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
}

function filterRows(rows: TransactionRow[], filters: FilterState, searchQuery: string) {
  const keyword = searchQuery.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch = !keyword || row.searchText.includes(keyword);
    const matchesFrom = !filters.fromDate || (row.dateIso && row.dateIso >= filters.fromDate);
    const matchesTo = !filters.toDate || (row.dateIso && row.dateIso <= filters.toDate);

    return matchesSearch && matchesFrom && matchesTo;
  });
}

function getCashflowErrorMessage(err: unknown, fallbackMessage: string) {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Sesi berakhir. Silakan login kembali.";
    }

    if (err.status === 403) {
      return "Kamu tidak punya akses untuk melihat cashflow.";
    }

    if (err.status === 404) {
      return "Data transaksi tidak ditemukan.";
    }

    return err.message || fallbackMessage;
  }

  return err instanceof Error ? err.message : fallbackMessage;
}

function getPaginationPages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
