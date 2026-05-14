"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import type { Jadwal, Tempat } from "@/lib/api";
import { formatCurrency, normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";

type Facility = {
  label: string;
  icon: LucideIcon;
};

type FeatureRoomCardProps = {
  title: string;
  price: string;
  facilities: Facility[];
  href: string | null;
  disabledReason?: string;
  badge?: string;
};

type RoomAvailabilityCardProps = {
  table: Tempat;
  schedule: Jadwal | null;
  active?: boolean;
};

export function FeatureRoomCard({
  title,
  price,
  facilities,
  href,
  disabledReason = "Belum ada slot tersedia",
  badge,
}: FeatureRoomCardProps) {
  return (
    <article className="flex min-h-[222px] flex-col rounded-[12px] border border-[#CFE8DA] bg-[#EEF8F2] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="min-w-0 text-[24px] font-extrabold leading-none text-[#174D3D]">{title}</h2>
        {badge ? (
          <span className="w-fit rounded-[8px] bg-[#FFF4E8] px-4 py-2 text-[18px] font-black leading-none text-[#DC2626] shadow-[0_4px_6px_rgba(0,0,0,0.25)] sm:shrink-0">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(82px,1fr))] items-start gap-x-4 gap-y-5">
        {facilities.map((facility) => {
          const Icon = facility.icon;
          return (
            <div key={facility.label} className="flex flex-col items-center text-center">
              <Icon className="h-10 w-10 stroke-[2.6] text-[#098F90]" aria-hidden="true" />
              <span className="mt-2 text-[14px] font-extrabold text-[#078180]">{facility.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <p className="min-w-0 text-[24px] font-black leading-none text-[#065948]">{price}</p>
        {href ? (
          <Link
            href={href}
            className="w-full rounded-[8px] bg-[#F5A400] px-3 py-1.5 text-center text-[18px] font-black leading-none text-[#073B31] shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#FFB21A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073B31] sm:w-auto"
          >
            BOOK NOW
          </Link>
        ) : (
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[128px] sm:items-end">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title={disabledReason}
              className="w-full cursor-not-allowed rounded-[8px] border border-[#70B59E] bg-[#2F7D67] px-3 py-1.5 text-[18px] font-black leading-none text-white shadow-[0_4px_6px_rgba(0,0,0,0.22)] disabled:opacity-100 sm:w-auto"
            >
              BOOK NOW
            </button>
            <span className="text-left text-[11px] font-bold leading-tight text-[#0F4C3E]/70 sm:max-w-[150px] sm:text-right">
              {disabledReason}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export function RoomAvailabilityCard({ table, schedule, active = false }: RoomAvailabilityCardProps) {
  const type = roomTypeFromPrice(table.harga);
  const available = table.status.toLowerCase() === "available" && Boolean(schedule);

  return (
    <article
      className={`relative h-[112px] rounded-[6px] border bg-white p-3 shadow-[0_4px_6px_rgba(0,0,0,0.28)] ${
        active ? "border-[#3B82F6]" : "border-transparent"
      }`}
    >
      <h3 className="truncate text-[22px] font-extrabold leading-none text-[#075746]">
        {roomLabel(table.nomor_meja, `Room #${table.id_tempat}`)} - {type}
      </h3>
      <div className="mt-2 flex gap-8 text-[14px] font-bold text-[#6B7280]">
        <span>{type === "VIP" ? "8" : "5"} Tables</span>
        <span>
          {normalizeTime(schedule?.jam_mulai)} - {normalizeTime(schedule?.jam_selesai)}
        </span>
      </div>
      <p className="mt-2 text-[12px] font-bold text-[#6B7280]">{formatCurrency(table.harga)}/hr</p>
      {available && schedule ? (
        <Link
          href={buildPaymentHref(table, schedule)}
          className="absolute bottom-3 right-3 rounded-[8px] border border-[#64748B] bg-[#ECFDF5] px-3 py-1 text-[12px] font-black text-[#005344]"
        >
          AVAILABLE
        </Link>
      ) : (
        <span className="absolute bottom-3 right-3 rounded-[8px] border border-[#F87171] bg-[#FFF1F2] px-3 py-1 text-[12px] font-black text-[#DC2626]">
          OCCUPIED
        </span>
      )}
    </article>
  );
}

export function buildPaymentHref(table: Tempat, schedule: Jadwal) {
  return `/user/payment?id_tempat=${table.id_tempat}&id_jadwal=${schedule.id_jadwal}`;
}
