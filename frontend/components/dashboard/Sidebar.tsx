"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  MapPin,
  Menu,
  UserCircle,
  X,
} from "lucide-react";

import type { SidebarMenuItem } from "@/data/dashboardDummy";

const menuIcons: Record<SidebarMenuItem["icon"], LucideIcon> = {
  booking: CalendarDays,
  dashboard: LayoutDashboard,
  history: History,
};

type SidebarProps = {
  menu: SidebarMenuItem[];
};

export function Sidebar({ menu }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col px-3 pb-6 pt-3 lg:px-4">
      <div className="flex items-center gap-2 md:justify-center lg:justify-start">
        <Image
          src="/Logo Sibooking.png"
          alt="SiBooking logo"
          width={42}
          height={42}
          className="h-10 w-10 shrink-0 object-contain"
          priority
        />
        <span className="text-[1rem] font-black leading-none text-[#247056] md:hidden lg:inline">
          SiBooking
        </span>
      </div>

      <button className="mt-4 flex h-12 min-w-0 items-center justify-between rounded-full bg-[#ccebd8] px-3 text-[#194b3f] shadow-[0_1px_0_rgba(24,75,63,0.06)] md:justify-center md:px-2 lg:justify-between lg:px-3">
        <span className="flex min-w-0 items-center gap-2 text-base font-black lg:text-lg">
          <MapPin
            className="h-5 w-5 shrink-0 fill-[#0a1917] text-[#0a1917] lg:h-6 lg:w-6"
            aria-hidden="true"
          />
          <span className="truncate md:hidden lg:inline">Blok M</span>
        </span>
        <ChevronDown
          className="hidden h-5 w-5 shrink-0 stroke-[3] lg:block"
          aria-hidden="true"
        />
      </button>

      <nav className="mt-6 grid gap-3 md:gap-4">
        {menu.map((item) => {
          const Icon = menuIcons[item.icon];

          return (
            <a
              key={item.label}
              href="#"
              onClick={() => setIsOpen(false)}
              className={`relative flex h-10 min-w-0 items-center rounded-lg px-2 text-sm font-black transition hover:bg-[#fffaf1] md:justify-center lg:justify-start lg:gap-3 ${
                item.active ? "bg-[#fffaf1] text-black" : "text-black"
              }`}
            >
              {item.active ? (
                <span className="absolute left-0 h-7 w-0.5 rounded-full bg-[#f6a400] lg:left-[2.45rem]" />
              ) : null}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                  item.active ? "text-[#312185]" : "text-[#aeb9c5]"
                }`}
              >
                <Icon
                  className="h-[1.1rem] w-[1.1rem] stroke-[3]"
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
        <div className="relative mb-4 flex h-10 min-w-0 items-center rounded-lg bg-[#d9ece4] pl-11 pr-1 md:justify-center md:pl-1 lg:justify-start lg:pl-11">
          <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#2c7b5d] md:left-1/2 md:-translate-x-1/2 lg:left-0 lg:translate-x-0">
            <UserCircle
              className="h-8 w-8 text-[#d7f0e5]"
              aria-hidden="true"
            />
          </div>
          <div className="flex h-6 min-w-0 flex-1 items-center justify-center rounded-md bg-[#226a52] px-2 text-[0.7rem] font-black text-white md:hidden lg:flex">
            USER
          </div>
        </div>

        <div className="grid gap-3 md:gap-4">
          <a
            href="#"
            onClick={() => setIsOpen(false)}
            className="flex h-8 min-w-0 items-center gap-4 rounded-lg text-sm font-black text-black transition hover:bg-[#fffaf1] md:justify-center lg:justify-start"
          >
            <UserCircle
              className="h-[1.1rem] w-[1.1rem] shrink-0 text-[#aeb9c5]"
              aria-hidden="true"
            />
            <span className="truncate md:hidden lg:inline">Profile</span>
          </a>
          <a
            href="#"
            onClick={() => setIsOpen(false)}
            className="flex h-8 min-w-0 items-center gap-4 rounded-lg text-sm font-black text-black transition hover:bg-[#fffaf1] md:justify-center lg:justify-start"
          >
            <LogOut
              className="h-[1.1rem] w-[1.1rem] shrink-0 text-[#aeb9c5]"
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
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#e5e8e4] bg-white/96 px-4 shadow-[0_4px_16px_rgba(21,51,44,0.08)] backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/Logo Sibooking.png"
            alt="SiBooking logo"
            width={38}
            height={38}
            className="h-9 w-9 shrink-0 object-contain"
            priority
          />
          <span className="truncate text-base font-black text-[#247056]">
            SiBooking
          </span>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ccebd8] text-[#194b3f]"
        >
          {isOpen ? (
            <X className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          )}
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-[#e5e8e4] bg-white md:flex lg:w-[9.75rem]">
        {sidebarContent}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden">
          <aside className="absolute left-3 right-3 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[#e5e8e4] bg-white shadow-[0_20px_60px_rgba(21,51,44,0.22)]">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
