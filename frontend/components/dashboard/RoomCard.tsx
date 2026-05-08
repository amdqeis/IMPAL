import type { RoomCardItem } from "@/data/dashboardDummy";

type RoomCardProps = {
  room: RoomCardItem;
};

export function RoomCard({ room }: RoomCardProps) {
  const isAvailable = room.status === "AVAILABLE";

  return (
    <article
      className={`relative h-[112px] min-w-0 rounded-[18px] border bg-white p-5 pb-12 shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${
        room.active
          ? "border-[#60A5FA] ring-2 ring-[#DBEAFE]"
          : "border-[#E5E7EB]"
      }`}
    >
      <h3 className="truncate text-[18px] font-bold leading-none text-[#035444]">
        {room.name} - {room.type}
      </h3>

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 text-[14px] font-medium leading-none text-[#6B7280]">
        <span>{room.tables} Tables</span>
        <span>{room.time}</span>
      </div>

      <span
        className={`absolute bottom-4 right-4 rounded-lg border px-3 py-1 text-[12px] font-bold leading-none ${
          isAvailable
            ? "border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]"
            : "border-[#FCA5A5] bg-[#FEF2F2] text-[#EF4444]"
        }`}
      >
        {room.status}
      </span>
    </article>
  );
}
