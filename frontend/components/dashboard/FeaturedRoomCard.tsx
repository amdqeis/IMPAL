import type { LucideIcon } from "lucide-react";
import {
  Fan,
  ShieldCheck,
  Snowflake,
  Sofa,
  Table2,
  Tv,
  UsersRound,
} from "lucide-react";

import type { FacilityItem, FeaturedRoom } from "@/data/dashboardDummy";

const facilityIcons: Record<FacilityItem["icon"], LucideIcon> = {
  fan: Fan,
  shield: ShieldCheck,
  snowflake: Snowflake,
  sofa: Sofa,
  table: Table2,
  tv: Tv,
  users: UsersRound,
};

type FeaturedRoomCardProps = {
  room: FeaturedRoom;
};

export function FeaturedRoomCard({ room }: FeaturedRoomCardProps) {
  return (
    <article className="flex h-full min-h-[11rem] min-w-0 flex-col rounded-2xl border border-[#cde1d7] bg-[#edf8f2] px-4 py-4 shadow-[0_8px_16px_rgba(20,54,44,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(20,54,44,0.22)] sm:min-h-[10.75rem] lg:px-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 text-xl font-black leading-tight tracking-[-0.02em] text-[#174d3d] sm:text-[1.32rem] lg:text-[1.38rem]">
          {room.title}
        </h2>
        {room.badge ? (
          <span className="shrink-0 rounded-lg border border-[#f1cdbf] bg-[#fff8ef] px-3 py-1 text-sm font-black leading-none text-[#e03636] shadow-[2px_4px_6px_rgba(80,44,26,0.16)] sm:text-base">
            {room.badge}
          </span>
        ) : null}
      </div>

      <div
        className="mt-5 grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 data-[vip=true]:lg:grid-cols-4"
        data-vip={room.facilities.length === 4}
      >
        {room.facilities.map((facility) => {
          const Icon = facilityIcons[facility.icon];

          return (
            <div
              key={facility.label}
              className="flex min-w-0 flex-col items-center text-center"
            >
              <Icon
                className="h-7 w-7 stroke-[2.4] text-[#098f90] sm:h-8 sm:w-8"
                aria-hidden="true"
              />
              <p className="mt-1 max-w-full text-[0.68rem] font-extrabold leading-tight text-[#078180] sm:text-[0.7rem]">
                {facility.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <p className="min-w-0 text-lg font-black leading-tight text-[#065948] sm:text-[1.14rem] lg:text-[1.28rem]">
          {room.price}
        </p>
        <button className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-[#085d4c] px-3 text-xs font-black leading-none text-white shadow-[2px_4px_5px_rgba(8,82,67,0.28)] transition hover:bg-[#064d40] sm:text-sm">
          BOOK NOW
        </button>
      </div>
    </article>
  );
}
