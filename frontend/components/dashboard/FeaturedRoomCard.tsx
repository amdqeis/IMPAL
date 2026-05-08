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
  const hasBadge = Boolean(room.badge);

  return (
    <article className="relative flex min-h-[220px] min-w-0 flex-col rounded-[22px] border border-[#DCEFE4] bg-[#EDF8F2] p-5 shadow-[0_8px_24px_rgba(15,91,71,0.08)] md:h-[220px]">
      <h2
        className={`text-[20px] font-bold leading-tight text-[#174D3D] ${
          hasBadge ? "pr-28" : ""
        }`}
      >
        {room.title}
      </h2>

      {room.badge ? (
        <span className="absolute right-5 top-5 rounded-xl bg-[#FFF4E8] px-4 py-2 text-[14px] font-bold leading-none text-[#DC2626] shadow-sm">
          {room.badge}
        </span>
      ) : null}

      <div className="mt-6 flex min-w-0 flex-1 flex-wrap items-start justify-evenly gap-4">
        {room.facilities.map((facility) => {
          const Icon = facilityIcons[facility.icon];

          return (
            <div
              key={facility.label}
              className="flex min-w-[72px] flex-1 flex-col items-center text-center"
            >
              <Icon
                className="h-9 w-9 stroke-[2.4] text-[#098F90] lg:h-10 lg:w-10"
                aria-hidden="true"
              />
              <p className="mt-2 text-[12px] font-bold leading-tight text-[#078180]">
                {facility.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex min-w-0 items-end justify-between gap-4">
        <p className="min-w-0 text-[20px] font-extrabold leading-tight text-[#065948]">
          {room.price}
        </p>
        <button className="flex h-[42px] shrink-0 items-center justify-center rounded-xl bg-[#0F7B61] px-6 text-[14px] font-extrabold leading-none text-white shadow-md transition hover:bg-[#0B5E4A]">
          BOOK NOW
        </button>
      </div>
    </article>
  );
}
