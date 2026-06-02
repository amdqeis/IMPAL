"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import { ApiError, api, clearAuth, type Reservasi } from "@/lib/api";
import { formatDate, normalizeTime, roomLabel } from "@/lib/format";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "refunded";

type DateRange = {
  from: string;
  to: string;
};

type ScheduleDay = {
  iso: string;
  weekday: string;
  dateLabel: string;
};

type ScheduleBooking = {
  id: number;
  dateIso: string;
  startHour: number;
  startMinutes: number;
  customerName: string;
  roomName: string;
  branchName: string;
  status: string;
  statusLabel: string;
  timeRange: string;
  searchText: string;
};

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 21;
const EMPTY_RESERVATIONS: Reservasi[] = [];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled/Declined" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
];

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];

export default function AdminSchedulePage() {
  return (
    <AppShell role="admin">
      <AdminScheduleContent />
    </AppShell>
  );
}

function AdminScheduleContent() {
  const router = useRouter();
  const toast = useToast();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const [dateRange, setDateRange] = useState<DateRange>(() => getCurrentMonthRange());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);

  const branchId = selectedBranch?.id_cabang ?? null;
  const fetchBranchReservations = useCallback(
    (signal: AbortSignal) => {
      if (!branchId) {
        return Promise.resolve([]);
      }

      const statusQuery =
        statusFilter === "pending" || statusFilter === "confirmed" || statusFilter === "completed"
          ? statusFilter
          : undefined;

      return api.reservasi.list(
        {
          id_cabang: branchId,
          start_date: dateRange.from,
          end_date: dateRange.to,
          status_reservasi: statusQuery,
          search: debouncedSearchQuery || undefined,
        },
        { signal },
      );
    },
    [branchId, dateRange.from, dateRange.to, debouncedSearchQuery, statusFilter],
  );
  const branchReservations = useBranchResourceCache<Reservasi[]>({
    resource: "admin-schedule",
    branchId,
    cacheParts: ["reservations", dateRange.from, dateRange.to, statusFilter, debouncedSearchQuery],
    enabled: Boolean(branchId),
    fetcher: fetchBranchReservations,
  });

  const reservations = branchReservations.data ?? EMPTY_RESERVATIONS;
  const rangeError = getRangeError(dateRange);
  const scheduleError = branchReservations.error
    ? getApiErrorMessage(branchReservations.error, "Gagal memuat data schedule.")
    : null;

  useEffect(() => {
    if (!branchReservations.error) {
      return;
    }

    if (branchReservations.error instanceof ApiError && branchReservations.error.status === 401) {
      clearAuth();
      router.replace("/admin/login");
    }

    toast.error(scheduleError ?? "Gagal memuat data schedule.");
  }, [branchReservations.error, router, scheduleError, toast]);

  const scheduleBookings = useMemo(() => toScheduleBookings(reservations), [reservations]);
  const filteredBookings = useMemo(
    () => filterBookings(scheduleBookings, dateRange, statusFilter, searchQuery),
    [dateRange, scheduleBookings, searchQuery, statusFilter],
  );
  const days = useMemo(
    () => (rangeError ? [] : buildScheduleDays(dateRange.from, dateRange.to)),
    [dateRange.from, dateRange.to, rangeError],
  );
  const hours = useMemo(() => buildScheduleHours(filteredBookings), [filteredBookings]);
  const bookingsByCell = useMemo(() => groupBookingsByCell(filteredBookings), [filteredBookings]);
  const gridTemplateColumns = days.length > 0
    ? `86px repeat(${days.length}, minmax(96px, 1fr))`
    : "86px";
  const gridMinWidth = Math.max(1040, 86 + days.length * 96);

  const updateDateRange = (key: keyof DateRange, value: string) => {
    setDateRange((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="w-full min-w-0 max-w-[1220px] px-4 py-8 sm:px-6 lg:px-8 xl:ml-4">
      <section className="rounded-[12px] border border-[#D9D9D9] bg-white/85 p-5 shadow-[0_16px_42px_rgba(17,48,41,0.06)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[38px] font-extrabold leading-none tracking-normal text-[#0F4C3E] sm:text-[40px]">
              Schedule
            </h1>
            <p className="mt-1 text-[16px] font-black text-[#16A34A]">
              Management billiard table reservation
            </p>
            {selectedBranch ? (
              <p className="mt-2 text-[13px] font-bold text-[#6A9484]">
                Menampilkan data cabang {selectedBranch.nama}
                {branchReservations.refreshing ? " - menyegarkan data..." : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-7 grid gap-3 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(150px,0.45fr)_minmax(260px,1fr)]">
          <DateFilter
            label="From"
            value={dateRange.from}
            max={dateRange.to}
            onChange={(value) => updateDateRange("from", value)}
          />
          <DateFilter
            label="To"
            value={dateRange.to}
            min={dateRange.from}
            onChange={(value) => updateDateRange("to", value)}
          />
          <label className="block">
            <span className="sr-only">Status reservasi</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 w-full rounded-[10px] border border-[#DCEFE4] bg-[#EEF3F0] px-4 text-[15px] font-black text-[#1F2937] outline-none transition focus:border-[#174D3D] focus:bg-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B6C1D0]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Reservation..."
              className="h-11 w-full rounded-[10px] border border-[#1F2937] bg-white pl-12 pr-4 text-[16px] font-bold text-[#174D3D] outline-none transition placeholder:text-[#B6C1D0] focus:border-[#174D3D] focus:ring-2 focus:ring-[#CFE8DA]"
            />
          </label>
        </div>

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
            <EmptyState message="Pilih cabang terlebih dahulu untuk melihat schedule." />
          </div>
        ) : (
          <>
            {scheduleError ? (
              <div className="mt-5">
                <ErrorState message={scheduleError} />
              </div>
            ) : null}
            {rangeError ? (
              <div className="mt-5">
                <ErrorState message={rangeError} />
              </div>
            ) : null}
            {branchReservations.loading ? (
              <div className="mt-5">
                <LoadingState label="Memuat data schedule..." />
              </div>
            ) : !rangeError && filteredBookings.length === 0 ? (
              <div className="mt-5">
                <EmptyState message="Tidak ada reservasi yang sesuai dengan filter saat ini." />
              </div>
            ) : null}

            <div className="mt-5 overflow-x-auto rounded-[12px] border border-[#D8E5DD] bg-white">
              <div
                className="grid text-center"
                style={{
                  gridTemplateColumns,
                  minWidth: `${gridMinWidth}px`,
                }}
              >
                <div className="sticky left-0 z-20 border-r border-[#D8E5DD] bg-[#F2F8F4] p-3 text-[20px] font-black text-[#174D3D]">
                  Time
                </div>
                {days.map((day) => (
                  <div key={day.iso} className="border-r border-[#D8E5DD] bg-[#F2F8F4] p-3 last:border-r-0">
                    <p className="text-[20px] font-black leading-none text-[#174D3D]">{day.weekday}</p>
                    <p className="mt-1 text-[14px] font-black text-[#5B7769]">{day.dateLabel}</p>
                  </div>
                ))}

                {hours.map((hour) => (
                  <ScheduleRow
                    key={hour}
                    hour={hour}
                    days={days}
                    bookingsByCell={bookingsByCell}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DateFilter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-11 min-w-0 items-center gap-2 rounded-[10px] border border-[#DCEFE4] bg-white px-3 text-[#1F2937] transition focus-within:border-[#174D3D] focus-within:ring-2 focus-within:ring-[#CFE8DA]">
      <CalendarDays className="h-4 w-4 shrink-0 text-[#6A9484]" aria-hidden="true" />
      <span className="shrink-0 text-[14px] font-black text-[#6B7280]">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-black text-[#1F2937] outline-none"
      />
    </label>
  );
}

function ScheduleRow({
  hour,
  days,
  bookingsByCell,
}: {
  hour: number;
  days: ScheduleDay[];
  bookingsByCell: Map<string, ScheduleBooking[]>;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 border-r border-t border-[#D8E5DD] bg-white py-3 text-[16px] font-black text-[#5B7769]">
        {formatHourLabel(hour)}
      </div>
      {days.map((day) => {
        const bookings = bookingsByCell.get(getCellKey(day.iso, hour)) ?? [];

        return (
          <div
            key={`${day.iso}-${hour}`}
            className="min-h-[46px] border-r border-t border-[#D8E5DD] bg-white px-2 py-1.5 last:border-r-0"
          >
            <div className="grid gap-1">
              {bookings.map((booking) => (
                <article
                  key={booking.id}
                  title={`#${booking.id} ${booking.customerName} - ${booking.roomName} - ${booking.timeRange}`}
                  className={`rounded-[4px] border px-1.5 py-1 text-[11px] font-black leading-none shadow-[0_2px_6px_rgba(17,48,41,0.04)] ${bookingChipClass(booking.status)}`}
                >
                  <p className="truncate">{booking.customerName}</p>
                  <p className="mt-0.5 truncate text-[10px] opacity-80">{booking.roomName}</p>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function toScheduleBookings(reservations: Reservasi[]): ScheduleBooking[] {
  return reservations
    .map((reservation) => {
      const status = normalizeStatus(reservation.status) || "pending";
      const dateIso = normalizeDateIso(reservation.tanggal);
      const startTime = normalizeTime(reservation.jadwal?.jam_mulai);
      const endTime = normalizeTime(reservation.jadwal?.jam_selesai);
      const startMinutes = parseTimeToMinutes(startTime) ?? DEFAULT_START_HOUR * 60;
      const startHour = Math.floor(startMinutes / 60);
      const customerName = reservation.user?.nama ?? `User #${reservation.id_user}`;
      const roomName = roomLabel(reservation.tempat?.nomor_meja, `Room #${reservation.id_tempat}`);
      const branchName = reservation.tempat?.cabang?.nama ?? "Cabang tidak diketahui";
      const statusLabel = getStatusLabel(status);
      const dateLabel = formatDate(dateIso);
      const timeRange = `${startTime} - ${endTime}`;

      return {
        id: reservation.id_reservasi,
        dateIso,
        startHour,
        startMinutes,
        customerName,
        roomName,
        branchName,
        status,
        statusLabel,
        timeRange,
        searchText: [
          reservation.id_reservasi,
          customerName,
          roomName,
          branchName,
          status,
          statusLabel,
          dateIso,
          dateLabel,
          timeRange,
          reservation.total_harga,
        ]
          .join(" ")
          .toLowerCase(),
      };
    })
    .sort((a, b) => {
      if (a.dateIso !== b.dateIso) {
        return a.dateIso.localeCompare(b.dateIso);
      }

      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }

      return a.roomName.localeCompare(b.roomName);
    });
}

function filterBookings(
  bookings: ScheduleBooking[],
  dateRange: DateRange,
  statusFilter: StatusFilter,
  searchQuery: string,
) {
  const keyword = searchQuery.trim().toLowerCase();

  return bookings.filter((booking) => {
    const matchesRange = booking.dateIso >= dateRange.from && booking.dateIso <= dateRange.to;
    const matchesStatus = matchesStatusFilter(booking.status, statusFilter);
    const matchesSearch = !keyword || booking.searchText.includes(keyword);

    return matchesRange && matchesStatus && matchesSearch;
  });
}

function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "cancelled") {
    return status === "cancelled" || status === "declined";
  }

  return status === filter;
}

function groupBookingsByCell(bookings: ScheduleBooking[]) {
  const map = new Map<string, ScheduleBooking[]>();

  for (const booking of bookings) {
    const key = getCellKey(booking.dateIso, booking.startHour);
    const current = map.get(key) ?? [];
    current.push(booking);
    map.set(key, current);
  }

  for (const cellBookings of map.values()) {
    cellBookings.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }

      return a.roomName.localeCompare(b.roomName);
    });
  }

  return map;
}

function buildScheduleHours(bookings: ScheduleBooking[]) {
  const bookingHours = bookings.map((booking) => booking.startHour);
  const start = Math.min(DEFAULT_START_HOUR, ...bookingHours);
  const end = Math.max(DEFAULT_END_HOUR, ...bookingHours);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function buildScheduleDays(from: string, to: string): ScheduleDay[] {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);

  if (!start || !end || start > end) {
    return [];
  }

  const days: ScheduleDay[] = [];
  const current = new Date(start);

  while (current <= end) {
    days.push({
      iso: formatDateInputValue(current),
      weekday: weekdayLabels[current.getDay()],
      dateLabel: formatDayMonth(current),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getCurrentMonthRange(): DateRange {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    from: formatDateInputValue(firstDay),
    to: formatDateInputValue(lastDay),
  };
}

function getRangeError(dateRange: DateRange) {
  if (!dateRange.from || !dateRange.to) {
    return "Tanggal From dan To wajib diisi.";
  }

  const from = parseIsoDate(dateRange.from);
  const to = parseIsoDate(dateRange.to);

  if (!from || !to) {
    return "Format tanggal tidak valid.";
  }

  if (from > to) {
    return "Rentang tanggal tidak valid. Tanggal From harus sebelum atau sama dengan To.";
  }

  return null;
}

function getApiErrorMessage(err: unknown, fallbackMessage: string) {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Sesi berakhir. Silakan login kembali.";
    }

    if (err.status === 403) {
      return "Kamu tidak punya akses untuk melihat schedule.";
    }

    return err.message || fallbackMessage;
  }

  return err instanceof Error ? err.message : fallbackMessage;
}

function normalizeDateIso(value: string) {
  return value.slice(0, 10);
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseTimeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function formatDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getCellKey(dateIso: string, hour: number) {
  return `${dateIso}-${hour}`;
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getStatusLabel(status: string) {
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

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function bookingChipClass(status: string) {
  if (status === "cancelled" || status === "declined") {
    return "border-[#FCA5A5] bg-[#FEE2E2] text-[#DC2626]";
  }

  if (status === "completed" || status === "refunded") {
    return "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]";
  }

  return "border-[#CFE8DA] bg-[#EFFAF3] text-[#21684E]";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, value]);

  return debouncedValue;
}
