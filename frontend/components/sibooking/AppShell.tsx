"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  MapPin,
  Menu,
  UserCircle,
  UsersRound,
  X,
} from "lucide-react";

import { api, getStoredAuth, type AuthResponse } from "@/lib/api";

type Role = "user" | "admin";
type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const userMenu: MenuItem[] = [
  { label: "Dashboard", href: "/user/dashboard", icon: LayoutDashboard },
  { label: "Booking", href: "/user/booking", icon: CalendarDays },
  { label: "History", href: "/user/history", icon: History },
];

const adminMenu: MenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Booking", href: "/admin/booking", icon: CalendarDays },
  { label: "Cashflow", href: "/admin/cashflow", icon: Banknote },
  { label: "Data Users", href: "/admin/users", icon: UsersRound },
  { label: "Schedule", href: "/admin/schedule", icon: Clock3 },
];

type AppShellProps = {
  role: Role;
  children: ReactNode;
};

export function AppShell({ role, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [auth] = useState<AuthResponse | null>(() => getStoredAuth());

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored) {
      router.replace("/login");
      return;
    }

    const roles = stored.roles.map((item) => item.toLowerCase());
    if (role === "admin" && !roles.includes("admin")) {
      router.replace("/user/dashboard");
    }
    if (role === "user" && roles.includes("admin")) {
      router.replace("/admin/dashboard");
    }
  }, [role, router]);

  const menu = role === "admin" ? adminMenu : userMenu;
  const profileHref = role === "admin" ? "/admin/profile" : "/user/profile";
  const location = role === "admin" ? "Depok" : "Blok M";
  const displayName = auth?.user.nama ?? (role === "admin" ? "Andre Hungkul" : "Jonathan Doang");

  const sidebarContent = useMemo(
    () => (
      <div className="flex h-full min-h-0 flex-col px-4 py-5">
        <Link href={role === "admin" ? "/admin/dashboard" : "/user/dashboard"} className="flex items-center gap-2 md:justify-center lg:justify-start">
          <Image
            src="/Logo Sibooking.png"
            alt="SiBooking logo"
            width={46}
            height={46}
            className="h-[46px] w-[46px] shrink-0 object-contain"
            priority
          />
          <span className="text-[18px] font-extrabold leading-none text-[#174D3D] md:hidden lg:inline">
            SiBooking
          </span>
        </Link>

        <button className="mt-5 flex h-[50px] min-w-0 items-center justify-between rounded-full bg-[#CFEED9] px-4 text-[#194B3F] md:justify-center md:px-2 lg:justify-between lg:px-4">
          <span className="flex min-w-0 items-center gap-2 text-[24px] font-extrabold">
            <MapPin className="h-[28px] w-[28px] shrink-0 fill-black text-black" aria-hidden="true" />
            <span className="truncate md:hidden lg:inline">{location}</span>
          </span>
          <ChevronDown className="hidden h-6 w-6 shrink-0 stroke-[3] text-black lg:block" aria-hidden="true" />
        </button>

        <nav className="mt-7 grid gap-4">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="relative flex h-11 min-w-0 items-center rounded-xl px-2 text-[18px] font-extrabold text-black transition hover:bg-[#FFF8ED] md:justify-center md:px-0 lg:justify-start lg:gap-4 lg:px-2"
              >
                {active ? <span className="absolute left-0 h-8 w-[3px] rounded-full bg-[#F5A400]" /> : null}
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center ${active ? "text-[#312783]" : "text-[#B6C1D0]"}`}>
                  <Icon className="h-[21px] w-[21px] stroke-[2.7]" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate md:hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div className="mb-3 flex min-w-0 items-center gap-2 rounded-full bg-[#D8F1E2] p-1.5 md:justify-center lg:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#196246]">
              <UserCircle className="h-9 w-9 text-[#DDF3E8]" aria-hidden="true" />
            </div>
            <div className="flex h-7 min-w-0 flex-1 items-center justify-center rounded-lg bg-[#21684E] px-2 md:hidden lg:flex">
              <p className="truncate text-[14px] font-extrabold leading-none text-white">{role.toUpperCase()}</p>
            </div>
          </div>
          <p className="mb-3 hidden truncate px-2 text-center text-[12px] font-bold text-[#21684E] lg:block">
            {displayName}
          </p>

          <div className="grid gap-3">
            <Link
              href={profileHref}
              onClick={() => setIsOpen(false)}
              className="relative flex h-10 min-w-0 items-center gap-4 rounded-xl px-2 text-[18px] font-extrabold text-black transition hover:bg-[#FFF8ED] md:justify-center md:px-0 lg:justify-start lg:px-2"
            >
              {pathname === profileHref ? <span className="absolute left-0 h-8 w-[3px] rounded-full bg-[#F5A400]" /> : null}
              <UserCircle className={`h-[21px] w-[21px] shrink-0 ${pathname === profileHref ? "text-[#312783]" : "text-[#B6C1D0]"}`} aria-hidden="true" />
              <span className="truncate md:hidden lg:inline">Profile</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                api.auth.logout();
                setIsOpen(false);
                router.replace("/login");
              }}
              className="flex h-10 min-w-0 items-center gap-4 rounded-xl px-2 text-left text-[18px] font-extrabold text-black transition hover:bg-[#FFF8ED] md:justify-center md:px-0 lg:justify-start lg:px-2"
            >
              <LogOut className="h-[21px] w-[21px] shrink-0 text-[#B6C1D0]" aria-hidden="true" />
              <span className="truncate md:hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    ),
    [displayName, location, menu, pathname, profileHref, role, router],
  );

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#FCFCFC] font-[family-name:var(--font-inter)] text-[#0F4C3E]">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-4 shadow-[0_4px_16px_rgba(15,91,71,0.08)] backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/Logo Sibooking.png" alt="SiBooking logo" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" priority />
          <span className="truncate text-[18px] font-extrabold text-[#174D3D]">SiBooking</span>
        </div>
        <button
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CFEED9] text-[#194B3F]"
        >
          {isOpen ? <X className="h-5 w-5 stroke-[3]" aria-hidden="true" /> : <Menu className="h-5 w-5 stroke-[3]" aria-hidden="true" />}
        </button>
      </header>

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[86px] border-r border-[#E5E7EB] bg-white md:block lg:w-[218px]">
        {sidebarContent}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden">
          <aside className="absolute left-4 right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_20px_60px_rgba(15,91,71,0.18)]">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <section className="relative ml-0 min-h-screen min-w-0 flex-1 overflow-x-hidden pt-16 md:ml-[86px] md:pt-0 lg:ml-[218px]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/Logo%20Sibooking.png')] bg-[length:220px_220px] bg-repeat opacity-[0.04]" />
        <div className="relative z-10 min-w-0">{children}</div>
      </section>
    </main>
  );
}
