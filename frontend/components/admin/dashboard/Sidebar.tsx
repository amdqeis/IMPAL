"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  MapPin,
  Menu,
  UsersRound,
  UserCircle,
  WalletCards,
  X,
} from "lucide-react";

import type { AdminMenuItem } from "@/data/adminDashboardDummy";

const menuIcons: Record<AdminMenuItem["icon"], LucideIcon> = {
  booking: CalendarDays,
  cashflow: Banknote,
  dashboard: LayoutDashboard,
  schedule: WalletCards,
  users: UsersRound,
};

type SidebarProps = {
  menu: AdminMenuItem[];
};

export function Sidebar({ menu }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col px-4 py-5">
      <div className="flex items-center gap-2 md:justify-center lg:justify-start">
        <Image
          src="/Logo Sibooking.png"
          alt="SiBooking logo"
          width={46}
          height={46}
          className="h-[46px] w-[46px] shrink-0 object-contain"
          priority
        />
        <span className="text-[18px] font-extrabold leading-none text-[#26725A] md:hidden lg:inline">
          SiBooking
        </span>
      </div>

      <button className="mt-5 flex h-[48px] min-w-0 items-center justify-between rounded-[20px] bg-[#DDF1E5] px-5 text-[#194B3F] md:justify-center md:px-2 lg:justify-between lg:px-5">
        <span className="flex min-w-0 items-center gap-2 text-[18px] font-extrabold">
          <MapPin
            className="h-[24px] w-[24px] shrink-0 fill-[#0B1714] text-[#0B1714]"
            aria-hidden="true"
          />
          <span className="truncate md:hidden lg:inline">Depok</span>
        </span>
        <ChevronDown
          className="hidden h-5 w-5 shrink-0 stroke-[3] text-black lg:block"
          aria-hidden="true"
        />
      </button>

      <nav className="mt-8 grid gap-4">
        {menu.map((item) => {
          const Icon = menuIcons[item.icon];

          return (
            <a
              key={item.label}
              href="#"
              onClick={() => setIsOpen(false)}
              className={`relative flex h-11 min-w-0 items-center rounded-xl px-3 text-[14px] transition md:justify-center md:px-0 lg:justify-start lg:gap-4 lg:px-3 ${
                item.active
                  ? "bg-[#FFF8ED] font-bold text-[#111827]"
                  : "font-semibold text-[#111827] hover:bg-[#FFF8ED]"
              }`}
            >
              {item.active ? (
                <span className="absolute left-0 top-1/2 h-[28px] w-[3px] -translate-y-1/2 rounded-full bg-[#F59E0B]" />
              ) : null}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                  item.active ? "text-[#6C63FF]" : "text-[#B7C2D0]"
                }`}
              >
                <Icon
                  className="h-[18px] w-[18px] stroke-[2.6]"
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0 truncate md:hidden lg:inline">
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="mb-5 flex min-w-0 items-center gap-3 rounded-2xl bg-[#EAF7EF] p-3 md:justify-center lg:justify-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D7C5F]">
            <UserCircle
              className="h-8 w-8 text-[#DDF3E8]"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 md:hidden lg:block">
            <p className="truncate text-[16px] font-extrabold leading-none text-white">
              <span className="rounded-lg bg-[#236D52] px-5 py-1">ADMIN</span>
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <a
            href="#"
            onClick={() => setIsOpen(false)}
            className="flex h-10 min-w-0 items-center gap-4 rounded-xl px-3 text-[14px] font-semibold text-[#111827] transition hover:bg-[#FFF8ED] md:justify-center md:px-0 lg:justify-start lg:px-3"
          >
            <UserCircle
              className="h-[18px] w-[18px] shrink-0 text-[#B7C2D0]"
              aria-hidden="true"
            />
            <span className="truncate md:hidden lg:inline">Profile</span>
          </a>
          <a
            href="#"
            onClick={() => setIsOpen(false)}
            className="flex h-10 min-w-0 items-center gap-4 rounded-xl px-3 text-[14px] font-semibold text-[#111827] transition hover:bg-[#FFF8ED] md:justify-center md:px-0 lg:justify-start lg:px-3"
          >
            <LogOut
              className="h-[18px] w-[18px] shrink-0 text-[#B7C2D0]"
              aria-hidden="true"
            />
            <span className="truncate md:hidden lg:inline">Logout</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-4 shadow-[0_4px_16px_rgba(15,91,71,0.08)] backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/Logo Sibooking.png"
            alt="SiBooking logo"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
            priority
          />
          <span className="truncate text-[18px] font-extrabold text-[#26725A]">
            SiBooking
          </span>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DDF1E5] text-[#194B3F]"
        >
          {isOpen ? (
            <X className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          )}
        </button>
      </header>

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[86px] border-r border-[#E5E7EB] bg-white md:block lg:w-[226px]">
        {sidebarContent}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden">
          <aside className="absolute left-4 right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_20px_60px_rgba(15,91,71,0.18)]">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
