"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  MapPin,
  Menu,
  Search,
  UserCircle,
  UsersRound,
  X,
} from "lucide-react";

import { api, getStoredAuth, type AuthResponse, type Cabang } from "@/lib/api";
import { hasAdminRole, hasOwnerRole } from "@/lib/auth";

type Role = "user" | "admin" | "owner";
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

const ownerMenu: MenuItem[] = [
  { label: "Reports", href: "/owner/reports", icon: FileText },
];

type AppShellProps = {
  role: Role;
  children: ReactNode;
};

type SelectedBranchContextValue = {
  branches: Cabang[];
  selectedBranch: Cabang | null;
  branchesLoading: boolean;
  branchesError: string | null;
  selectBranch: (branch: Cabang) => void;
};

const SELECTED_BRANCH_KEY = "sibooking_selected_branch_id";
const SelectedBranchContext = createContext<SelectedBranchContextValue | null>(null);

export function useSelectedBranch() {
  const context = useContext(SelectedBranchContext);

  if (!context) {
    throw new Error("useSelectedBranch must be used inside AppShell");
  }

  return context;
}

export function AppShell({ role, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<Cabang[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() =>
    readStoredBranchId(),
  );
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [auth] = useState<AuthResponse | null>(() => getStoredAuth());
  const loginPath = role === "user" ? "/login" : "/admin/login";

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored) {
      router.replace(loginPath);
      return;
    }

    const isOwner = hasOwnerRole(stored.roles);
    const isAdmin = hasAdminRole(stored.roles);

    if (role === "owner" && !isOwner) {
      router.replace(isAdmin ? "/admin/dashboard" : "/user/dashboard");
      return;
    }

    if (role === "admin" && isOwner) {
      router.replace("/owner/reports");
      return;
    }

    if (role === "admin" && !isAdmin) {
      router.replace("/user/dashboard");
      return;
    }

    if (role === "user" && (isOwner || isAdmin)) {
      router.replace(isOwner ? "/owner/reports" : "/admin/dashboard");
    }
  }, [loginPath, role, router]);

  const menu = role === "owner" ? ownerMenu : role === "admin" ? adminMenu : userMenu;
  const profileHref = role === "owner" ? "/owner/profile" : role === "admin" ? "/admin/profile" : "/user/profile";
  const displayName = auth?.user.nama ?? (role === "user" ? "Jonathan Doang" : "Andre Hungkul");
  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id_cabang === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );
  const selectBranch = useCallback((branch: Cabang) => {
    setSelectedBranchId(branch.id_cabang);
    storeBranchId(branch.id_cabang);
  }, []);
  const branchContextValue = useMemo<SelectedBranchContextValue>(
    () => ({
      branches,
      selectedBranch,
      branchesLoading,
      branchesError,
      selectBranch,
    }),
    [branches, selectedBranch, branchesLoading, branchesError, selectBranch],
  );

  useEffect(() => {
    let active = true;

    api.masterData
      .listCabang()
      .then((result) => {
        if (!active) {
          return;
        }

        setBranches(result);
        setSelectedBranchId((current) => {
          if (current !== null && result.some((branch) => branch.id_cabang === current)) {
            return current;
          }

          const fallbackId = result[0]?.id_cabang ?? null;
          storeBranchId(fallbackId);
          return fallbackId;
        });
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setBranches([]);
        setSelectedBranchId(null);
        storeBranchId(null);
        setBranchesError(err instanceof Error ? err.message : "Gagal memuat cabang");
      })
      .finally(() => {
        if (active) {
          setBranchesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const sidebarContent = useMemo(
    () => (
      <div className="flex h-full min-h-0 flex-col px-4 py-5">
        <Link href={role === "owner" ? "/owner/reports" : role === "admin" ? "/admin/dashboard" : "/user/dashboard"} className="flex items-center gap-2 md:justify-center lg:justify-start">
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

        <BranchDropdown
          branches={branches}
          selectedBranch={selectedBranch}
          branchesLoading={branchesLoading}
          branchesError={branchesError}
          onSelect={selectBranch}
        />

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
                router.replace(loginPath);
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
    [
      branches,
      branchesError,
      branchesLoading,
      displayName,
      loginPath,
      menu,
      pathname,
      profileHref,
      role,
      router,
      selectBranch,
      selectedBranch,
    ],
  );

  return (
    <SelectedBranchContext.Provider value={branchContextValue}>
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
    </SelectedBranchContext.Provider>
  );
}

function BranchDropdown({
  branches,
  selectedBranch,
  branchesLoading,
  branchesError,
  onSelect,
}: {
  branches: Cabang[];
  selectedBranch: Cabang | null;
  branchesLoading: boolean;
  branchesError: string | null;
  onSelect: (branch: Cabang) => void;
}) {
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const branchDropdownRef = useRef<HTMLDivElement | null>(null);
  const branchLabel = branchesLoading
    ? "Memuat..."
    : selectedBranch?.nama ?? "Pilih Cabang";
  const filteredBranches = useMemo(() => {
    const keyword = branchSearch.trim().toLowerCase();

    if (!keyword) {
      return branches;
    }

    return branches.filter((branch) =>
      [branch.nama, branch.lokasi].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [branchSearch, branches]);

  useEffect(() => {
    if (!isBranchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(target)
      ) {
        setIsBranchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isBranchOpen]);

  return (
    <div ref={branchDropdownRef} className="relative mt-5">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isBranchOpen}
        onClick={() => setIsBranchOpen((current) => !current)}
        className="flex h-[50px] w-full min-w-0 items-center justify-between rounded-full bg-[#CFEED9] px-4 text-[#194B3F] transition hover:bg-[#BDE7CA] md:justify-center md:px-2 lg:justify-between lg:px-4"
      >
        <span className="flex min-w-0 items-center gap-2 text-[24px] font-extrabold">
          <MapPin className="h-[28px] w-[28px] shrink-0 fill-black text-black" aria-hidden="true" />
          <span className="truncate md:hidden lg:inline">{branchLabel}</span>
        </span>
        <ChevronDown
          className={`hidden h-6 w-6 shrink-0 stroke-[3] text-black transition lg:block ${
            isBranchOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isBranchOpen ? (
        <div className="absolute left-0 right-0 top-[58px] z-50 min-w-[238px] rounded-[14px] border border-[#CFE8DA] bg-white p-3 shadow-[0_16px_36px_rgba(15,91,71,0.18)] md:left-0 md:right-auto lg:left-0 lg:right-0 lg:min-w-0">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A9484]" aria-hidden="true" />
            <input
              type="search"
              value={branchSearch}
              onChange={(event) => setBranchSearch(event.target.value)}
              placeholder="Cari cabang..."
              className="h-10 w-full rounded-[8px] border border-[#DCEFE4] bg-[#F8FFFB] pl-9 pr-3 text-[14px] font-bold text-[#174D3D] outline-none transition placeholder:text-[#8EA0B8] focus:border-[#174D3D] focus:bg-white"
            />
          </label>

          <div className="mt-3 max-h-[240px] overflow-y-auto pr-1" role="listbox">
            {branchesLoading ? (
              <div className="rounded-[8px] bg-[#F8FFFB] px-3 py-4 text-center text-[13px] font-bold text-[#6B7280]">
                Memuat cabang...
              </div>
            ) : branchesError ? (
              <div className="rounded-[8px] border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-3 text-[13px] font-bold text-[#B91C1C]">
                {branchesError}
              </div>
            ) : branches.length === 0 ? (
              <div className="rounded-[8px] border border-dashed border-[#BFD9CB] bg-[#F8FFFB] px-3 py-4 text-center text-[13px] font-bold text-[#6B7280]">
                Belum ada cabang.
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="rounded-[8px] border border-dashed border-[#BFD9CB] bg-[#F8FFFB] px-3 py-4 text-center text-[13px] font-bold text-[#6B7280]">
                Cabang tidak ditemukan.
              </div>
            ) : (
              <div className="grid gap-1">
                {filteredBranches.map((branch) => {
                  const active = selectedBranch?.id_cabang === branch.id_cabang;

                  return (
                    <button
                      key={branch.id_cabang}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onSelect(branch);
                        setIsBranchOpen(false);
                        setBranchSearch("");
                      }}
                      className={`flex min-w-0 items-center gap-3 rounded-[8px] px-3 py-2 text-left transition ${
                        active ? "bg-[#ECFDF3] text-[#174D3D]" : "text-[#194B3F] hover:bg-[#FFF8ED]"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-black">
                          {branch.nama}
                        </span>
                        {branch.lokasi ? (
                          <span className="mt-0.5 block truncate text-[12px] font-bold text-[#6A9484]">
                            {branch.lokasi}
                          </span>
                        ) : null}
                      </span>
                      {active ? (
                        <Check className="h-4 w-4 shrink-0 stroke-[3] text-[#16A34A]" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function readStoredBranchId() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SELECTED_BRANCH_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function storeBranchId(branchId: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (branchId === null) {
    window.localStorage.removeItem(SELECTED_BRANCH_KEY);
    return;
  }

  window.localStorage.setItem(SELECTED_BRANCH_KEY, String(branchId));
}
