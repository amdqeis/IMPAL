"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { Fan, ShieldCheck, Snowflake, Sofa, Table2, Tv, UsersRound } from "lucide-react";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { buildPaymentHref, FeatureRoomCard, RoomAvailabilityCard } from "@/components/user/dashboard/DashboardCards";
import { api, clearAuth, getStoredAuth, type Jadwal, type Tempat } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { roomTypeFromPrice } from "@/lib/format";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

type DashboardData = {
  tables: Tempat[];
  schedules: Jadwal[];
};

const ROOM_LIMIT = 24;
const EMPTY_TABLES: Tempat[] = [];
const EMPTY_SCHEDULES: Jadwal[] = [];

export default function UserDashboardPage() {
  return (
    <AppShell role="user">
      <UserDashboardContent />
    </AppShell>
  );
}

function UserDashboardContent() {
  const router = useRouter();
  const auth = getStoredAuth();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const branchId = selectedBranch?.id_cabang ?? null;
  const fetchDashboardData = useCallback(
    async (signal: AbortSignal): Promise<DashboardData> => {
      if (!branchId) {
        return { tables: [], schedules: [] };
      }

      const [tables, schedules] = await Promise.all([
        api.masterData.listTempat(
          {
            id_cabang: branchId,
            limit: ROOM_LIMIT,
            sort_by: "nomor_meja",
            sort_order: "asc",
          },
          { signal },
        ),
        api.jadwal.listTersedia(
          {
            id_cabang: branchId,
            limit: 100,
            sort_by: "jam_mulai",
            sort_order: "asc",
          },
          { signal },
        ),
      ]);

      return { tables, schedules };
    },
    [branchId],
  );
  const dashboard = useBranchResourceCache<DashboardData>({
    resource: "user-dashboard",
    branchId,
    cacheParts: ["rooms"],
    enabled: Boolean(branchId),
    fetcher: fetchDashboardData,
  });

  useEffect(() => {
    if (isUnauthorizedError(dashboard.error)) {
      clearAuth();
      router.replace("/login");
    }
  }, [dashboard.error, router]);

  const tables = dashboard.data?.tables ?? EMPTY_TABLES;
  const schedules = dashboard.data?.schedules ?? EMPTY_SCHEDULES;
  const schedulesByTable = useMemo(() => {
    const map = new Map<number, Jadwal>();
    for (const schedule of schedules) {
      if (!map.has(schedule.id_tempat)) {
        map.set(schedule.id_tempat, schedule);
      }
    }
    return map;
  }, [schedules]);
  const firstRegular = useMemo(
    () => findBookableRoom(tables, schedulesByTable, "Regular"),
    [schedulesByTable, tables],
  );
  const firstVip = useMemo(
    () => findBookableRoom(tables, schedulesByTable, "VIP"),
    [schedulesByTable, tables],
  );
  const errorMessage = dashboard.error
    ? getApiErrorMessage(dashboard.error, "Gagal memuat dashboard.", "Kamu tidak punya akses melihat data cabang.")
    : null;

  return (
    <div className="w-full max-w-[1180px] px-4 py-5 sm:px-6 md:px-8">
      <header>
        <p className="text-[12px] font-bold leading-none text-[#16A34A]">
          Welcomeback, {auth?.user.nama ?? "User"}!
        </p>
        <h1 className="mt-1 text-[38px] font-extrabold leading-[40px] tracking-normal text-[#0F4C3E] sm:text-[46px] sm:leading-[48px] lg:text-[36px] lg:leading-[38px]">
          DASHBOARD
        </h1>
      </header>

      {branchesError ? (
        <div className="mt-4">
          <ErrorState message={branchesError} />
        </div>
      ) : branchesLoading ? (
        <div className="mt-4">
          <LoadingState label="Memuat cabang..." />
        </div>
      ) : !selectedBranch ? (
        <div className="mt-4">
          <EmptyState message="Belum ada cabang yang dapat ditampilkan." />
        </div>
      ) : (
        <>
          {errorMessage ? (
            <div className="mt-4">
              <ErrorState message={errorMessage} />
            </div>
          ) : null}

          <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <FeatureRoomCard
              title="Regular Room"
              price="IDR 35.000/hr"
              href={firstRegular ? buildPaymentHref(firstRegular.table, firstRegular.schedule) : null}
              disabledReason="Belum ada slot Regular tersedia"
              facilities={[
                { label: "Social Area", icon: UsersRound },
                { label: "Fan Cooled", icon: Fan },
                { label: "12 Tables Ready", icon: Table2 },
              ]}
            />
            <FeatureRoomCard
              title="VIP Room"
              price="IDR 75.000/hr"
              badge="LIMITED"
              href={firstVip ? buildPaymentHref(firstVip.table, firstVip.schedule) : null}
              disabledReason="Belum ada slot VIP tersedia"
              facilities={[
                { label: "Full AC", icon: Snowflake },
                { label: "Sofa Seats", icon: Sofa },
                { label: "Smart TV", icon: Tv },
                { label: "Private Area", icon: ShieldCheck },
              ]}
            />
          </section>

          <section className="mt-9">
            <div className="mb-5">
              <h2 className="text-[18px] font-bold leading-none text-[#111827]">Rooms</h2>
              <div className="mt-3 h-[4px] w-[64px] rounded-full bg-[#F5A400]" />
            </div>

            {dashboard.loading ? (
              <LoadingState label="Memuat room..." />
            ) : tables.length === 0 ? (
              <EmptyState message="Belum ada room untuk cabang ini." />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {tables.map((table, index) => (
                  <RoomAvailabilityCard
                    key={table.id_tempat}
                    table={table}
                    schedule={schedulesByTable.get(table.id_tempat) ?? null}
                    active={index === 0}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function findBookableRoom(tables: Tempat[], schedulesByTable: Map<number, Jadwal>, type: "Regular" | "VIP") {
  const table = tables.find(
    (item) =>
      item.status.toLowerCase() === "available" &&
      roomTypeFromPrice(item.harga) === type &&
      schedulesByTable.has(item.id_tempat),
  );

  if (!table) {
    return null;
  }

  return {
    table,
    schedule: schedulesByTable.get(table.id_tempat)!,
  };
}
