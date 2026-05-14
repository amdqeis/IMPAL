"use client";

import Image from "next/image";
import Link from "next/link";

import type { Reservasi } from "@/lib/api";
import { normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";

type ReservationCardProps = {
  reservation: Reservasi;
  paymentStatus?: string | null;
  showPaymentStatus?: boolean;
  href?: string;
  actionLabel?: string;
};

export function ReservationCard({
  reservation,
  paymentStatus,
  showPaymentStatus = false,
  href,
  actionLabel,
}: ReservationCardProps) {
  const room = reservation.tempat;
  const schedule = reservation.jadwal;
  const customerName = reservation.user?.nama ?? `User #${reservation.id_user}`;
  const customerPhone = reservation.user?.no_hp ?? "-";
  const statusLabel = getPaymentStatusLabel(paymentStatus);

  const card = (
    <article className="relative min-h-[222px] overflow-hidden rounded-[12px] border border-[#CFE8DA] bg-[#EEF8F2] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.28)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#F5A400] group-hover:shadow-[0_10px_18px_rgba(23,77,61,0.22)]">
      <div className="relative z-10 max-w-[250px]">
        <h2 className="text-[24px] font-black leading-none text-[#174D3D]">
          {roomLabel(room?.nomor_meja, `Room #${reservation.id_tempat}`)} - {roomTypeFromPrice(room?.harga)}
        </h2>
        <div className="mt-3 text-[20px] font-black leading-[1.18] text-[#008B8F]">
          <p className="truncate">{customerName}</p>
          <p>{customerPhone}</p>
          <p>{formatReservationDate(reservation.tanggal)}</p>
          <p>
            {normalizeTime(schedule?.jam_mulai)} - {normalizeTime(schedule?.jam_selesai)}
          </p>
        </div>
      </div>

      <Image
        src="/billiard-ball(Dashboard User).png"
        alt=""
        width={115}
        height={115}
        className="absolute right-7 top-12 h-[92px] w-[92px] object-contain md:h-[115px] md:w-[115px]"
      />

      {showPaymentStatus ? (
        <div className="absolute bottom-4 right-5 flex flex-col items-end gap-1">
          {actionLabel ? (
            <span className="rounded-full bg-[#F5A400] px-3 py-1 text-[11px] font-black uppercase tracking-normal text-[#073B31] shadow-[0_3px_8px_rgba(0,0,0,0.18)]">
              {actionLabel}
            </span>
          ) : null}
          <div className="flex h-[28px] min-w-[118px] items-center justify-center rounded-[7px] border border-[#64748B] bg-[#EEF8F2] px-4 text-[18px] font-black text-[#005344]">
            {statusLabel}
          </div>
        </div>
      ) : null}
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      aria-label={`Open booking ${reservation.id_reservasi}`}
      className="group block cursor-pointer rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A400] focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}

export function formatReservationDate(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(date);
  const monthYear = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);

  return `${day}, ${monthYear}`;
}

function getPaymentStatusLabel(status: string | null | undefined) {
  const normalized = status?.toLowerCase();

  if (normalized === "paid") {
    return "PAID";
  }

  return "UNPAID";
}
