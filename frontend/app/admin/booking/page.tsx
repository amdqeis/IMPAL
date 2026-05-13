"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FilterX,
  MapPin,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import { ApiError, api, clearAuth, type Pembayaran, type Reservasi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

type StatusTab = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "refunded";
type ActionStatus = "confirmed" | "declined";

type BookingRow = {
  id: number;
  reservation: Reservasi;
  payment: Pembayaran | null;
  roomName: string;
  roomType: string;
  customerName: string;
  branchKey: string;
  branchName: string;
  reservationStatus: string;
  reservationStatusLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  dateIso: string;
  dateLabel: string;
  timeRange: string;
  totalLabel: string;
  searchText: string;
};

type ConfirmAction = {
  booking: BookingRow;
  status: ActionStatus;
};

type FilterState = {
  date: string;
  paymentStatus: string;
  roomType: string;
};

type BranchBookingData = {
  reservations: Reservasi[];
  payments: Pembayaran[];
};

type SelectOption = {
  value: string;
  label: string;
};

const ITEMS_PER_PAGE = 9;
const DEFAULT_TAB: StatusTab = "pending";
const EMPTY_RESERVATIONS: Reservasi[] = [];
const EMPTY_PAYMENTS: Pembayaran[] = [];

const statusTabs: Array<{ key: StatusTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "completed", label: "Completed" },
  { key: "refunded", label: "Refunded" },
];

const emptyFilters: FilterState = {
  date: "",
  paymentStatus: "all",
  roomType: "all",
};

export default function AdminBookingPage() {
  return (
    <AppShell role="admin">
      <AdminBookingContent />
    </AppShell>
  );
}

function AdminBookingContent() {
  const router = useRouter();
  const toast = useToast();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>(DEFAULT_TAB);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingRow | null>(null);

  const handleApiError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearAuth();
          router.replace("/admin/login");
          return "Sesi berakhir. Silakan login kembali.";
        }

        if (err.status === 403) {
          return "Kamu tidak punya akses untuk mengelola booking.";
        }

        if (err.status === 404) {
          return "Data booking tidak ditemukan.";
        }

        return err.message || fallbackMessage;
      }

      return err instanceof Error ? err.message : fallbackMessage;
    },
    [router],
  );

  const branchId = selectedBranch?.id_cabang ?? null;
  const fetchBranchBookings = useCallback(
    async (signal: AbortSignal): Promise<BranchBookingData> => {
      if (!branchId) {
        return { reservations: [], payments: [] };
      }

      const [reservationResult, paymentResult] = await Promise.all([
        api.reservasi.list(
          {
            id_cabang: branchId,
            tanggal: filters.date || undefined,
            search: debouncedSearchQuery || undefined,
          },
          { signal },
        ),
        api.pembayaran.list(
          {
            id_cabang: branchId,
            status_pembayaran: filters.paymentStatus === "all" ? undefined : filters.paymentStatus,
            search: debouncedSearchQuery || undefined,
          },
          { signal },
        ),
      ]);

      return { reservations: reservationResult, payments: paymentResult };
    },
    [branchId, debouncedSearchQuery, filters.date, filters.paymentStatus],
  );
  const branchBookings = useBranchResourceCache<BranchBookingData>({
    resource: "admin-bookings",
    branchId,
    cacheParts: ["raw", filters.date, filters.paymentStatus, debouncedSearchQuery],
    enabled: Boolean(branchId),
    fetcher: fetchBranchBookings,
  });
  const reservations = branchBookings.data?.reservations ?? EMPTY_RESERVATIONS;
  const payments = branchBookings.data?.payments ?? EMPTY_PAYMENTS;
  const loading = branchBookings.loading;

  useEffect(() => {
    if (!branchBookings.error) {
      return;
    }

    const message = handleApiError(branchBookings.error, "Gagal memuat data booking.");
    setError(message);
    toast.error(message);
  }, [branchBookings.error, handleApiError, toast]);

  const rows = useMemo(() => toBookingRows(reservations, payments), [reservations, payments]);
  const paymentStatusOptions = useMemo(() => buildPaymentStatusOptions(rows), [rows]);

  const rowsAfterSearchAndFilters = useMemo(
    () => filterRows(rows, debouncedSearchQuery, filters),
    [debouncedSearchQuery, filters, rows],
  );

  const tabCounts = useMemo(
    () =>
      statusTabs.reduce(
        (counts, tab) => ({
          ...counts,
          [tab.key]: rowsAfterSearchAndFilters.filter((row) => matchesTab(row, tab.key)).length,
        }),
        {} as Record<StatusTab, number>,
      ),
    [rowsAfterSearchAndFilters],
  );

  const visibleRows = useMemo(
    () => rowsAfterSearchAndFilters.filter((row) => matchesTab(row, activeTab)),
    [activeTab, rowsAfterSearchAndFilters],
  );

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleRows.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, visibleRows]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((row) => row.reservationStatus === "pending").length,
      confirmed: rows.filter((row) => row.reservationStatus === "confirmed").length,
      doneOrCancelled: rows.filter((row) =>
        ["cancelled", "declined", "completed"].includes(row.reservationStatus),
      ).length,
    }),
    [rows],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, branchId, debouncedSearchQuery, filters]);

  useEffect(() => {
    setError(null);
    setBusyId(null);
    setConfirmAction(null);
    setDetailBooking(null);
  }, [branchId]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setActiveTab(DEFAULT_TAB);
    setSearchQuery("");
    setFilters(emptyFilters);
    setPage(1);
    toast.info("Filter booking direset.");
  };

  const updateBookingStatus = async (booking: BookingRow, status: ActionStatus) => {
    setBusyId(booking.id);
    setError(null);

    try {
      const updated = await api.reservasi.updateStatus(booking.id, { status });
      branchBookings.invalidate();
      branchBookings.setData((current) =>
        current
          ? {
              ...current,
              reservations: current.reservations.map((item) =>
                item.id_reservasi === updated.id_reservasi
                  ? {
                      ...item,
                      ...updated,
                      user: updated.user ?? item.user,
                      tempat: updated.tempat ?? item.tempat,
                      jadwal: updated.jadwal ?? item.jadwal,
                    }
                  : item,
              ),
            }
          : current,
      );
      setConfirmAction(null);
      toast.success(status === "confirmed" ? "Booking berhasil diterima." : "Booking berhasil ditolak.");
      void branchBookings.refetch("background");
    } catch (err) {
      const message = handleApiError(err, "Gagal memperbarui status booking.");
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="w-full min-w-0 max-w-[1220px] px-4 py-6 sm:px-6 lg:px-8 xl:ml-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#6A9484]">
              Admin Reservations{selectedBranch ? ` - ${selectedBranch.nama}` : ""}
            </p>
            <h1 className="mt-1 text-[38px] font-black leading-none tracking-normal text-[#174D3D] sm:text-[44px]">
              Booking
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void branchBookings.refetch("foreground")}
            disabled={!selectedBranch || loading}
            className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#C6E5D2] bg-white px-4 text-[14px] font-black text-[#174D3D] shadow-[0_8px_20px_rgba(23,77,61,0.08)] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memuat..." : "Refresh Data"}
          </button>
        </header>

        {branchesError ? (
          <div className="mt-5">
            <ErrorState message={branchesError} />
          </div>
        ) : branchesLoading ? (
          <div className="mt-5">
            <LoadingState label="Memuat daftar cabang..." />
          </div>
        ) : !selectedBranch ? (
          <div className="mt-5">
            <EmptyState message="Pilih cabang terlebih dahulu untuk melihat data." />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#DCEFE4] bg-[#F8FFFB] px-4 py-3 text-[13px] font-bold text-[#6A9484]">
              <MapPin className="h-4 w-4 fill-[#174D3D] text-[#174D3D]" aria-hidden="true" />
              <span>Menampilkan data untuk cabang {selectedBranch.nama}.</span>
              {branchBookings.refreshing ? <span className="text-[#D98F00]">Menyegarkan cache...</span> : null}
            </div>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Booking" value={summary.total} />
          <SummaryCard label="Pending" value={summary.pending} tone="warning" />
          <SummaryCard label="Confirmed" value={summary.confirmed} tone="success" />
          <SummaryCard label="Cancelled/Completed" value={summary.doneOrCancelled} tone="muted" />
        </section>

        <section className="mt-6 rounded-[14px] border border-[#DCEFE4] bg-white/92 p-4 shadow-[0_16px_42px_rgba(17,48,41,0.08)]">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.55fr))_auto]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A9484]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari ID, customer, room, cabang, status, tanggal..."
                className="h-11 w-full rounded-[10px] border border-[#DCEFE4] bg-[#F8FFFB] pl-11 pr-4 text-[14px] font-bold text-[#174D3D] outline-none transition placeholder:text-[#8EA0B8] focus:border-[#174D3D] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="sr-only">Tanggal</span>
              <input
                type="date"
                value={filters.date}
                onChange={(event) => updateFilter("date", event.target.value)}
                className="h-11 w-full rounded-[10px] border border-[#DCEFE4] bg-[#F8FFFB] px-3 text-[14px] font-bold text-[#174D3D] outline-none transition focus:border-[#174D3D] focus:bg-white"
              />
            </label>
            <FilterSelect
              label="Pembayaran"
              value={filters.paymentStatus}
              onChange={(value) => updateFilter("paymentStatus", value)}
              options={paymentStatusOptions}
            />
            <FilterSelect
              label="Jenis Room"
              value={filters.roomType}
              onChange={(value) => updateFilter("roomType", value)}
              options={[
                { value: "all", label: "Semua Jenis" },
                { value: "regular", label: "Regular" },
                { value: "vip", label: "VIP" },
              ]}
            />
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#FECACA] bg-[#FFF7F7] px-4 text-[14px] font-black text-[#B91C1C] transition hover:bg-[#FEE2E2]"
            >
              <FilterX className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {statusTabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-black transition ${
                    active
                      ? "border-[#174D3D] bg-[#174D3D] text-white shadow-[0_8px_18px_rgba(23,77,61,0.16)]"
                      : "border-[#DCEFE4] bg-[#F8FFFB] text-[#174D3D] hover:bg-[#ECFDF3]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[12px] ${active ? "bg-white/18 text-white" : "bg-[#DDEFE5] text-[#21684E]"}`}>
                    {tabCounts[tab.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {error ? (
          <div className="mt-5">
            <ErrorState message={error} />
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5">
            <LoadingState label="Memuat data booking..." />
          </div>
        ) : paginatedRows.length > 0 ? (
          <>
            <section className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedRows.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  busy={busyId === booking.id}
                  onAccept={() => setConfirmAction({ booking, status: "confirmed" })}
                  onDecline={() => setConfirmAction({ booking, status: "declined" })}
                  onDetail={() => setDetailBooking(booking)}
                />
              ))}
            </section>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={visibleRows.length}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="mt-5">
            <EmptyState message="Tidak ada booking yang sesuai dengan tab atau filter saat ini." />
          </div>
        )}
          </>
        )}
      </div>

      {confirmAction ? (
        <ConfirmActionDialog
          action={confirmAction}
          busy={busyId === confirmAction.booking.id}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => updateBookingStatus(confirmAction.booking, confirmAction.status)}
        />
      ) : null}

      {detailBooking ? (
        <DetailDialog booking={detailBooking} onClose={() => setDetailBooking(null)} />
      ) : null}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "muted";
}) {
  const toneClass = {
    default: "border-[#C6E5D2] bg-[#F3FBF6] text-[#174D3D]",
    warning: "border-[#FED7AA] bg-[#FFF7ED] text-[#B45309]",
    success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
    muted: "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]",
  }[tone];

  return (
    <article className={`rounded-[12px] border px-4 py-4 shadow-[0_10px_28px_rgba(17,48,41,0.06)] ${toneClass}`}>
      <p className="text-[12px] font-black uppercase tracking-[0.12em] opacity-75">{label}</p>
      <p className="mt-2 text-[32px] font-black leading-none">{value}</p>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[10px] border border-[#DCEFE4] bg-[#F8FFFB] px-3 text-[14px] font-bold text-[#174D3D] outline-none transition focus:border-[#174D3D] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BookingCard({
  booking,
  busy,
  onAccept,
  onDecline,
  onDetail,
}: {
  booking: BookingRow;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onDetail: () => void;
}) {
  const isPending = booking.reservationStatus === "pending";
  const isConfirmed = booking.reservationStatus === "confirmed";

  return (
    <article className="group flex min-h-[286px] flex-col rounded-[12px] border border-[#DCEFE4] bg-white p-5 shadow-[0_12px_30px_rgba(17,48,41,0.10)] transition hover:-translate-y-0.5 hover:border-[#B9DDC7] hover:shadow-[0_18px_36px_rgba(17,48,41,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8EA0B8]">
            #{booking.id}
          </p>
          <h2 className="mt-1 truncate text-[18px] font-black leading-tight text-[#111827]">
            {booking.roomName} - {booking.roomType}
          </h2>
        </div>
        <StatusBadge label={booking.reservationStatusLabel} status={booking.reservationStatus} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoItem icon={UserRound} label="Customer" value={booking.customerName} />
        <InfoItem icon={MapPin} label="Cabang" value={booking.branchName} />
        <InfoItem icon={CalendarDays} label="Tanggal" value={booking.dateLabel} />
        <InfoItem icon={CalendarDays} label="Jam" value={booking.timeRange} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-[10px] border border-[#E8F3EC] bg-[#F8FFFB] p-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#8EA0B8]">Pembayaran</p>
          <div className="mt-2">
            <PaymentBadge label={booking.paymentStatusLabel} status={booking.paymentStatus} />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#8EA0B8]">Total</p>
          <p className="mt-2 truncate text-[15px] font-black text-[#174D3D]">{booking.totalLabel}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[#E5E7EB] pt-4">
        {isPending ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#174D3D] px-3 text-[13px] font-black text-white transition hover:bg-[#0F3D31] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
              Accept Booking
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDecline}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#FECACA] bg-[#FFF7F7] px-3 text-[13px] font-black text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4 stroke-[3]" aria-hidden="true" />
              Decline
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onDetail}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#C6E5D2] bg-[#F8FFFB] px-3 text-[13px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3]"
          >
            <Eye className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            Detail
          </button>
        )}
        {isConfirmed ? (
          <p className="w-full text-[12px] font-bold text-[#6A9484]">
            Booking sudah dikonfirmasi.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#8EA0B8]">
        <Icon className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-bold text-[#334155]">{value}</p>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-black leading-none ${reservationBadgeClass(status)}`}>
      {label}
    </span>
  );
}

function PaymentBadge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-black leading-none ${paymentBadgeClass(status)}`}>
      {label}
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

  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <nav className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-bold text-[#6A9484]">
        Menampilkan {totalItems} booking, halaman {currentPage} dari {totalPages}
      </p>
      <div className="flex w-full overflow-hidden rounded-full border border-[#174D3D] bg-white text-[16px] shadow-[0_10px_24px_rgba(17,48,41,0.08)] sm:w-auto">
        <PageButton label="Awal" disabled={currentPage === 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Sebelumnya" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="flex h-11 min-w-10 items-center justify-center border-l border-[#174D3D] px-3 font-black text-[#94A3B8]">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`h-11 min-w-10 border-l border-[#174D3D] px-3 font-black transition ${
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
      className="flex h-11 min-w-10 items-center justify-center border-l border-[#174D3D] px-3 text-[#174D3D] transition first:border-l-0 hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:text-[#B7C2D0] disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}

function ConfirmActionDialog({
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isAccept = action.status === "confirmed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="w-full max-w-[440px] rounded-[14px] border border-[#C6E5D2] bg-[#F8FFFB] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.24)]">
        <h2 className="text-[26px] font-black leading-tight text-[#174D3D]">
          {isAccept ? "Terima booking?" : "Tolak booking?"}
        </h2>
        <p className="mt-3 text-[14px] font-bold leading-6 text-[#60756B]">
          Pastikan data booking sudah benar sebelum status diperbarui.
        </p>
        <BookingMiniSummary booking={action.booking} />
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-10 rounded-[8px] border border-[#BFD9CB] bg-white px-4 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`h-10 rounded-[8px] px-4 text-[14px] font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition disabled:opacity-60 ${
              isAccept ? "bg-[#174D3D] hover:bg-[#0F3D31]" : "bg-[#DC2626] hover:bg-[#B91C1C]"
            }`}
          >
            {busy ? "Memproses..." : isAccept ? "Ya, terima" : "Ya, tolak"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDialog({ booking, onClose }: { booking: BookingRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="w-full max-w-[520px] rounded-[14px] border border-[#C6E5D2] bg-[#F8FFFB] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#6A9484]">Detail Booking</p>
            <h2 className="mt-1 text-[26px] font-black leading-tight text-[#174D3D]">
              #{booking.id} - {booking.roomName}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Tutup detail"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#60756B] transition hover:bg-[#ECFDF3] hover:text-[#174D3D]"
          >
            <X className="h-5 w-5 stroke-[2.6]" aria-hidden="true" />
          </button>
        </div>
        <BookingMiniSummary booking={booking} />
        <div className="mt-4 grid gap-3 rounded-[10px] bg-white p-4 text-[14px] font-bold text-[#334155]">
          <DetailLine label="Status Reservasi" value={booking.reservationStatusLabel} />
          <DetailLine label="Status Pembayaran" value={booking.paymentStatusLabel} />
          <DetailLine label="Total Harga" value={booking.totalLabel} />
          <DetailLine label="ID User" value={String(booking.reservation.id_user)} />
          <DetailLine label="ID Tempat" value={String(booking.reservation.id_tempat)} />
          <DetailLine label="ID Jadwal" value={String(booking.reservation.id_jadwal)} />
        </div>
      </div>
    </div>
  );
}

function BookingMiniSummary({ booking }: { booking: BookingRow }) {
  return (
    <div className="mt-5 rounded-[10px] bg-white p-4 shadow-[0_8px_18px_rgba(17,48,41,0.08)]">
      <p className="text-[17px] font-black text-[#111827]">
        {booking.roomName} - {booking.roomType}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#334155]">
        {booking.customerName} | {booking.branchName}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#334155]">
        {booking.dateLabel}, {booking.timeRange}
      </p>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E8F3EC] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[#6A9484]">{label}</span>
      <span className="text-right text-[#174D3D]">{value}</span>
    </div>
  );
}

function toBookingRows(reservations: Reservasi[], payments: Pembayaran[]): BookingRow[] {
  const paymentByReservation = getLatestPaymentByReservation(payments);

  return reservations.map((reservation) => {
    const payment = paymentByReservation.get(reservation.id_reservasi) ?? null;
    const roomName = roomLabel(reservation.tempat?.nomor_meja, `Room #${reservation.id_tempat}`);
    const roomType = roomTypeFromPrice(reservation.tempat?.harga);
    const customerName = reservation.user?.nama ?? `User #${reservation.id_user}`;
    const branchName = reservation.tempat?.cabang?.nama ?? "Cabang tidak diketahui";
    const branchKey = reservation.tempat?.id_cabang ? String(reservation.tempat.id_cabang) : normalizeStatus(branchName);
    const reservationStatus = normalizeStatus(reservation.status) || "pending";
    const paymentStatus = normalizeStatus(payment?.status) || "unpaid";
    const dateLabel = formatDate(reservation.tanggal);
    const timeRange = `${normalizeTime(reservation.jadwal?.jam_mulai)} - ${normalizeTime(reservation.jadwal?.jam_selesai)}`;
    const reservationStatusLabel = getReservationStatusLabel(reservationStatus);
    const paymentStatusLabel = getPaymentStatusLabel(paymentStatus);
    const totalLabel = formatCurrency(reservation.total_harga);

    return {
      id: reservation.id_reservasi,
      reservation,
      payment,
      roomName,
      roomType,
      customerName,
      branchKey,
      branchName,
      reservationStatus,
      reservationStatusLabel,
      paymentStatus,
      paymentStatusLabel,
      dateIso: reservation.tanggal,
      dateLabel,
      timeRange,
      totalLabel,
      searchText: [
        reservation.id_reservasi,
        customerName,
        roomName,
        roomType,
        branchName,
        reservationStatus,
        reservationStatusLabel,
        paymentStatus,
        paymentStatusLabel,
        reservation.tanggal,
        dateLabel,
        timeRange,
        totalLabel,
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
}

function getLatestPaymentByReservation(payments: Pembayaran[]) {
  const map = new Map<number, Pembayaran>();

  for (const payment of payments) {
    const current = map.get(payment.id_reservasi);
    if (!current || payment.id_payment > current.id_payment) {
      map.set(payment.id_reservasi, payment);
    }
  }

  return map;
}

function buildPaymentStatusOptions(rows: BookingRow[]): SelectOption[] {
  const map = new Map<string, string>();

  for (const row of rows) {
    if (!map.has(row.paymentStatus)) {
      map.set(row.paymentStatus, row.paymentStatusLabel);
    }
  }

  return [
    { value: "all", label: "Semua Bayar" },
    ...Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

function filterRows(rows: BookingRow[], searchQuery: string, filters: FilterState) {
  const keyword = searchQuery.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch = !keyword || row.searchText.includes(keyword);
    const matchesDate = !filters.date || row.dateIso === filters.date;
    const matchesPayment = filters.paymentStatus === "all" || row.paymentStatus === filters.paymentStatus;
    const matchesRoomType = filters.roomType === "all" || normalizeStatus(row.roomType) === filters.roomType;

    return matchesSearch && matchesDate && matchesPayment && matchesRoomType;
  });
}

function matchesTab(row: BookingRow, tab: StatusTab) {
  if (tab === "all") {
    return true;
  }
  if (tab === "cancelled") {
    return ["cancelled", "declined"].includes(row.reservationStatus);
  }
  if (tab === "refunded") {
    return row.paymentStatus === "refunded" || row.reservationStatus === "refunded";
  }

  return row.reservationStatus === tab;
}

function getReservationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    reschedule: "Rescheduled",
    rescheduled: "Rescheduled",
    cancelled: "Cancelled",
    declined: "Declined",
    completed: "Completed",
    refunded: "Refunded",
  };

  return labels[status] ?? toTitleCase(status);
}

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    paid: "Lunas",
    pending: "Pending",
    unpaid: "Belum Ada",
    refunded: "Refunded",
    refund: "Refund",
    failed: "Failed",
  };

  return labels[status] ?? toTitleCase(status);
}

function reservationBadgeClass(status: string) {
  if (status === "pending") {
    return "border-[#FED7AA] bg-[#FFF7ED] text-[#B45309]";
  }
  if (status === "confirmed") {
    return "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]";
  }
  if (["rescheduled", "reschedule"].includes(status)) {
    return "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]";
  }
  if (["cancelled", "declined"].includes(status)) {
    return "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]";
  }
  if (status === "completed") {
    return "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]";
  }
  if (status === "refunded") {
    return "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]";
  }
  return "border-[#DCEFE4] bg-[#F8FFFB] text-[#174D3D]";
}

function paymentBadgeClass(status: string) {
  if (status === "paid") {
    return "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]";
  }
  if (status === "pending") {
    return "border-[#FED7AA] bg-[#FFF7ED] text-[#B45309]";
  }
  if (status === "refunded") {
    return "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]";
  }
  if (status === "failed") {
    return "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]";
  }
  return "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]";
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
