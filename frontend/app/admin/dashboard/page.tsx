"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type AdminSummary, type Reservasi } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import {
  formatCurrency,
  formatDate,
  normalizeTime,
  reservationStatusLabel,
  roomLabel,
  roomTypeFromPrice,
} from "@/lib/format";

type DashboardBooking = {
  id: number;
  roomName: string;
  roomType: string;
  status: string;
  rawStatus: string;
  payment: string;
  date: string;
  dateIso: string;
  time: string;
  startTime: string;
  venue: string;
  customerName: string;
  customerPhone: string;
  total: string;
};

type ConfirmAction = {
  booking: DashboardBooking;
  status: "confirmed" | "declined";
};

type BranchStats = {
  active: number;
  paid: number;
  cancelled: number;
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: smoothEase },
  },
};

export default function AdminDashboardPage() {
  return (
    <AppShell role="admin">
      <AdminDashboardContent />
    </AppShell>
  );
}

function AdminDashboardContent() {
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const [reservationsData, setReservationsData] = useState<Reservasi[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedBranch) {
      setReservationsData([]);
      setReservationsLoading(false);
      setReservationsError(null);
      setSummary(null);
      setSummaryLoading(false);
      setSummaryError(null);
      return;
    }

    setReservationsLoading(true);
    setReservationsError(null);
    api.reservasi
      .list({
        id_cabang: selectedBranch.id_cabang,
        status_reservasi: "pending",
        start_date: getJakartaDateIso(),
        sort_by: "tanggal",
        sort_order: "asc",
        limit: 20,
      })
      .then((result) => {
        if (active) {
          setReservationsData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setReservationsError(err instanceof Error ? err.message : "Gagal memuat booking dashboard");
          setReservationsData(fallbackReservations);
        }
      })
      .finally(() => {
        if (active) {
          setReservationsLoading(false);
        }
      });

    setSummaryLoading(true);
    setSummaryError(null);
    api.laporan
      .summary({ id_cabang: selectedBranch.id_cabang })
      .then((result) => {
        if (active) {
          setSummary(result);
        }
      })
      .catch((err) => {
        if (active) {
          setSummaryError(err instanceof Error ? err.message : "Gagal memuat ringkasan dashboard");
        }
      })
      .finally(() => {
        if (active) {
          setSummaryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedBranch]);

  const branchReservations = useMemo(() => {
    return selectedBranch ? reservationsData : [];
  }, [reservationsData, selectedBranch]);
  const upcomingBookings = useMemo(
    () => toDashboardBookings(branchReservations, getJakartaDateIso()),
    [branchReservations],
  );
  const bookings = upcomingBookings.slice(0, 6);
  const nearestBooking = upcomingBookings[0] ?? null;
  const actionableCount = upcomingBookings.length;
  const fallbackBranchStats = useMemo(() => calculateBranchStats(branchReservations), [branchReservations]);
  const branchStats = {
    active: summary?.active_bookings ?? fallbackBranchStats.active,
    paid: summary?.paid_payments ?? fallbackBranchStats.paid,
    cancelled: fallbackBranchStats.cancelled,
  };

  const updateBooking = async (booking: DashboardBooking, status: string) => {
    setBusyId(booking.id);
    setReservationsError(null);

    try {
      const updated = await api.reservasi.updateStatus(booking.id, { status });
      setReservationsData((current) =>
        current.map((item) => {
          if (item.id_reservasi !== updated.id_reservasi) {
            return item;
          }

          return {
            ...item,
            ...updated,
            user: updated.user ?? item.user,
            tempat: updated.tempat ?? item.tempat,
            jadwal: updated.jadwal ?? item.jadwal,
          };
        }),
      );
      setConfirmAction(null);
    } catch (err) {
      setReservationsError(
        err instanceof Error ? err.message : "Gagal memperbarui booking",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="w-full min-w-0 max-w-[1180px] px-4 pb-6 pt-6 sm:px-6 lg:px-8 xl:ml-6">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: smoothEase }}
          className="pl-1"
        >
          <p className="text-[12px] font-extrabold leading-none text-[#16A34A]">
            Welcomeback, Andre!
          </p>
          <h1 className="mt-1 text-[32px] font-black leading-[34px] tracking-normal text-[#174D3D] sm:text-[38px] sm:leading-[38px]">
            DASHBOARD
          </h1>
        </motion.header>

        {reservationsError ? (
          <div className="mt-4">
            <ErrorState message={reservationsError} />
          </div>
        ) : null}
        {summaryError ? (
          <div className="mt-4">
            <ErrorState message={summaryError} />
          </div>
        ) : null}

        {branchesError ? (
          <div className="mt-4">
            <ErrorState message={branchesError} />
          </div>
        ) : branchesLoading ? (
          <div className="mt-4">
            <LoadingState label="Memuat cabang dashboard..." />
          </div>
        ) : !selectedBranch ? (
          <div className="mt-4">
            <EmptyState message="Belum ada cabang yang dapat ditampilkan." />
          </div>
        ) : (
          <>
            <p className="mt-4 pl-1 text-[13px] font-bold text-[#6A9484]">
              Menampilkan data cabang {selectedBranch.nama}
            </p>

            {summaryLoading ? (
              <div className="mt-4">
                <LoadingState label="Memuat statistik pembayaran..." />
              </div>
            ) : null}

            <motion.section
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="mt-7 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            >
              <NearestBookingCard booking={nearestBooking} />
              <StatisticCard
                active={branchStats.active}
                paid={branchStats.paid}
                pending={actionableCount}
                cancelled={branchStats.cancelled}
              />
            </motion.section>

            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="mt-[14px]"
            >
              <div className="pl-[10px]">
                <h2 className="text-[18px] font-black leading-none text-[#18181B]">
                  Bookings
                </h2>
                <div className="mt-[17px] h-[3px] w-[62px] rounded-full bg-[#F5A400]" />
              </div>

              {reservationsLoading ? (
                <div className="mt-4">
                  <LoadingState label="Memuat booking mendatang..." />
                </div>
              ) : bookings.length > 0 ? (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="mt-3 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                  {bookings.map((booking, index) => (
                    <DashboardBookingCard
                      key={`${booking.id}-${booking.dateIso}-${booking.startTime}`}
                      booking={booking}
                      active={index === 0}
                      busy={busyId === booking.id}
                      onAccept={() => setConfirmAction({ booking, status: "confirmed" })}
                      onDecline={() => setConfirmAction({ booking, status: "declined" })}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="mt-3">
                  <EmptyState message="Tidak ada booking pending saat ini." />
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Link
                  href="/admin/booking"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#D98F00] bg-[#F5A400] px-5 py-2.5 text-[15px] font-black text-[#111827] shadow-[0_6px_12px_rgba(245,164,0,0.28)] transition hover:bg-[#D98F00] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174D3D] sm:w-auto"
                >
                  <span>Lihat lainnya</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                </Link>
              </div>
            </motion.section>
          </>
        )}
      </div>

      {confirmAction ? (
        <ConfirmActionModal
          action={confirmAction}
          busy={busyId === confirmAction.booking.id}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => updateBooking(confirmAction.booking, confirmAction.status)}
        />
      ) : null}
    </>
  );
}

function NearestBookingCard({ booking }: { booking: DashboardBooking | null }) {
  const isEmpty = !booking;
  const title = booking ? `${booking.roomName} - ${booking.roomType}` : "Belum ada booking mendatang";
  const dateLine = booking ? `${booking.date} | ${durationLabel(booking.time)}` : "-";
  const venue = booking?.venue ?? "SiBooking";
  const initials = makeInitials(venue);

  return (
    <motion.article
      variants={itemVariants}
      whileHover={{ y: -3, scale: 1.005 }}
      className="min-h-[174px] overflow-hidden rounded-[14px] border border-[#C6E5D2] bg-[#EEF9F2]/95 px-4 py-4 shadow-[0_4px_8px_rgba(0,0,0,0.28)] sm:px-[22px]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[14px] font-black uppercase leading-tight text-[#6A9484]">
            BOOKING TERDEKAT
          </p>
          <div className="mt-[8px] flex flex-wrap items-center gap-3">
            <h2 className="min-w-0 break-words text-[22px] font-black leading-tight text-[#174D3D] sm:text-[26px]">
              {title}
            </h2>
            {!isEmpty ? (
              <span className="shrink-0 rounded-full bg-[#FBD75D] px-[15px] py-[6px] text-[13px] font-black leading-none text-black">
                {booking.status}
              </span>
            ) : null}
          </div>
          <p className="mt-[10px] text-[14px] font-bold leading-tight text-[#A4B9B0]">
            {dateLine}
          </p>
          {booking ? (
            <p className="mt-[12px] text-[13px] font-black leading-tight text-[#174D3D]">
              Menunggu keputusan admin
            </p>
          ) : null}
        </div>
        <Link
          href="/admin/schedule"
          className="shrink-0 text-[12px] font-black leading-tight text-[#0B74DE]"
        >
          Lihat Kalender
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <p className="min-w-0 max-w-full break-words text-[20px] font-black leading-tight text-[#174D3D] sm:text-[22px]">
          {venue}
        </p>
        <span className="flex h-[54px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[#CCF9D0] text-[16px] font-black text-[#008F35]">
          {initials}
        </span>
        <span className="flex h-[42px] shrink-0 items-center justify-center rounded-full bg-[#FFE3EA] px-[22px] text-[16px] font-black text-[#E91E63]">
          {booking ? durationLabel(booking.time) : "-"}
        </span>
      </div>
    </motion.article>
  );
}

function StatisticCard({
  active,
  paid,
  pending,
  cancelled,
}: {
  active: number;
  paid: number;
  pending: number;
  cancelled: number;
}) {
  return (
    <motion.article
      variants={itemVariants}
      whileHover={{ y: -3, scale: 1.005 }}
      className="min-h-[174px] rounded-[10px] border border-[#C6E5D2] bg-[#EEF9F2]/95 px-4 py-4 shadow-[0_4px_8px_rgba(0,0,0,0.28)] sm:px-[22px]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-[16px] font-black leading-tight text-[#6A9484]">
          Booking Statistic
        </h2>
        <a
          href="/admin/booking"
          className="text-[12px] font-black leading-tight text-[#0B74DE]"
        >
          View all statistic
        </a>
      </div>

      <div className="mt-[18px] flex h-[13px] overflow-hidden rounded-full bg-[#D9D9D9]">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "41%" }}
          transition={{ duration: 0.7, ease: smoothEase }}
          className="bg-[#2FAE9A]"
        />
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "28%" }}
          transition={{ duration: 0.7, delay: 0.08, ease: smoothEase }}
          className="bg-[#69BE6B]"
        />
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "11%" }}
          transition={{ duration: 0.7, delay: 0.16, ease: smoothEase }}
          className="bg-[#D9D9D9]"
        />
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "20%" }}
          transition={{ duration: 0.7, delay: 0.24, ease: smoothEase }}
          className="bg-[#FF817C]"
        />
      </div>

      <div className="mt-[21px] grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatisticItem label="AKTIF" value={active} />
        <StatisticItem label="LUNAS" value={paid} />
        <StatisticItem label="PENDING" value={pending} />
        <StatisticItem label="BATAL" value={cancelled} />
      </div>
    </motion.article>
  );
}

function StatisticItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] font-black leading-tight text-[#A4A7AA]">{label}</p>
      <p className="mt-[8px] text-[15px] font-black leading-tight text-[#174D3D]">
        {value}
      </p>
    </div>
  );
}

function DashboardBookingCard({
  booking,
  active,
  busy,
  onAccept,
  onDecline,
}: {
  booking: DashboardBooking;
  active: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.article
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: "0 10px 18px rgba(0,0,0,0.24)" }}
      className={`min-h-[236px] rounded-[8px] border bg-white px-4 py-[18px] shadow-[0_4px_6px_rgba(0,0,0,0.28)] sm:px-[18px] ${
        active ? "border-[#2F80ED]" : "border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase leading-tight text-[#94A3B8]">
            Booking #{booking.id}
          </p>
          <h3 className="mt-2 truncate text-[15px] font-black leading-tight text-[#111827]">
            {booking.roomName} - {booking.roomType}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#FFF4CC] px-3 py-1 text-[11px] font-black text-[#6B4E00]">
          {booking.status}
        </span>
      </div>

      <div className="mt-4 rounded-[8px] bg-[#F3FBF6] px-3 py-2">
        <p className="truncate text-[14px] font-black leading-tight text-[#174D3D]">
          {booking.customerName}
        </p>
        <p className="mt-1 truncate text-[12px] font-bold leading-tight text-[#64748B]">
          {booking.customerPhone}
        </p>
      </div>

      <div className="mt-[12px] grid grid-cols-2 gap-x-4 gap-y-[12px]">
        <InfoItem label="Bayar" value={booking.payment} />
        <InfoItem label="Date" value={booking.date} />
        <InfoItem label="Time" value={booking.time} />
        <InfoItem label="Total" value={booking.total} />
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-4 border-t border-[#E5E7EB] pt-[14px]">
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className="text-[14px] font-black leading-tight text-[#6C4AB6] transition hover:text-[#503296] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Processing..." : "Accept Booking"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDecline}
          className="text-[14px] font-black leading-tight text-[#CBD5E1] transition hover:text-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </motion.article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium leading-tight text-[#8EA0B8]">
        {label}
      </p>
      <p className="mt-[8px] truncate text-[14px] font-medium leading-tight text-[#27364A]">
        {value}
      </p>
    </div>
  );
}

function ConfirmActionModal({
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-confirm-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: smoothEase }}
        className="w-full max-w-[420px] rounded-[14px] border border-[#C6E5D2] bg-[#F5FFF8] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
      >
        <h2
          id="booking-confirm-title"
          className="text-[24px] font-black leading-none text-[#174D3D]"
        >
          {isAccept ? "Terima booking?" : "Tolak booking?"}
        </h2>
        <p className="mt-3 text-[14px] font-bold text-[#60756B]">
          Pastikan data booking berikut sudah benar sebelum melanjutkan aksi.
        </p>
        <div className="mt-5 rounded-[10px] bg-white p-4 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
          <p className="text-[16px] font-black text-[#111827]">
            {action.booking.roomName} - {action.booking.roomType}
          </p>
          <p className="mt-2 text-[14px] font-bold text-[#334155]">
            {action.booking.customerName} | {action.booking.customerPhone}
          </p>
          <p className="mt-2 text-[14px] font-bold text-[#334155]">
            {action.booking.date}
          </p>
          <p className="mt-1 text-[14px] font-bold text-[#334155]">
            {action.booking.time}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-[8px] border border-[#BFD9CB] bg-white px-4 py-2 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-[8px] px-4 py-2 text-[14px] font-black text-white shadow-[0_4px_8px_rgba(0,0,0,0.2)] transition disabled:opacity-60 ${
              isAccept ? "bg-[#174D3D] hover:bg-[#0F3D31]" : "bg-[#DC2626] hover:bg-[#B91C1C]"
            }`}
          >
            {busy ? "Memproses..." : isAccept ? "Ya, terima" : "Ya, tolak"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function toDashboardBookings(
  reservations: Reservasi[],
  todayIso: string,
): DashboardBooking[] {
  return reservations
    .filter(
      (reservation) =>
        reservation.tanggal >= todayIso && isPendingBookingStatus(reservation.status),
    )
    .sort((first, second) => {
      const firstKey = `${first.tanggal}T${normalizeTime(first.jadwal?.jam_mulai)}`;
      const secondKey = `${second.tanggal}T${normalizeTime(second.jadwal?.jam_mulai)}`;
      return firstKey.localeCompare(secondKey);
    })
    .map((reservation) => {
      const status = reservationStatusLabel(reservation.status);
      return {
        id: reservation.id_reservasi,
        roomName: roomLabel(reservation.tempat?.nomor_meja),
        roomType: roomTypeFromPrice(reservation.tempat?.harga),
        status,
        rawStatus: reservation.status,
        payment: paymentLabel(reservation.latest_payment_status ?? reservation.status),
        date: formatDate(reservation.tanggal),
        dateIso: reservation.tanggal,
        time: `${normalizeTime(reservation.jadwal?.jam_mulai)} - ${normalizeTime(
          reservation.jadwal?.jam_selesai,
        )}`,
        startTime: normalizeTime(reservation.jadwal?.jam_mulai),
        venue: reservation.tempat?.cabang?.nama ?? "SiBooking",
        customerName: reservation.user?.nama ?? `User #${reservation.id_user}`,
        customerPhone: reservation.user?.no_hp ?? "-",
        total: formatCurrency(reservation.total_harga),
      };
    });
}

function calculateBranchStats(reservations: Reservasi[]): BranchStats {
  return {
    active: reservations.filter((reservation) =>
      ["pending", "confirmed"].includes(normalizeStatus(reservation.status)),
    ).length,
    paid: 0,
    cancelled: reservations.filter((reservation) =>
      ["cancelled", "declined", "batal"].includes(normalizeStatus(reservation.status)),
    ).length,
  };
}

function paymentLabel(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "paid" || normalized === "confirmed" || normalized === "completed") {
    return "Lunas";
  }
  if (normalized === "refunded" || normalized === "declined" || normalized === "cancelled") {
    return "Refund";
  }
  return "Tagihan";
}

function isPendingBookingStatus(status: string) {
  return normalizeStatus(status) === "pending";
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function getJakartaDateIso() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "05";
  const day = parts.find((part) => part.type === "day")?.value ?? "08";
  return `${year}-${month}-${day}`;
}

function durationLabel(timeRange: string) {
  const [start, end] = timeRange.split(" - ");
  const startHour = Number(start?.slice(0, 2));
  const endHour = Number(end?.slice(0, 2));

  if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || endHour <= startHour) {
    return "-";
  }

  return `${endHour - startHour} jam`;
}

function makeInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "SB";
}
