import type { RoomCardItem } from "@/data/dashboardDummy";

type RoomCardProps = {
  room: RoomCardItem;
};

export function RoomCard({ room }: RoomCardProps) {
  const isAvailable = room.status === "AVAILABLE";

  return (
    <article
      className={`flex min-h-[6.2rem] min-w-0 flex-col rounded-lg border bg-white px-3.5 py-3 shadow-[0_5px_10px_rgba(21,51,44,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_16px_rgba(21,51,44,0.2)] ${
        room.active
          ? "border-[#4d95ff] shadow-[0_0_0_1px_rgba(77,149,255,0.18),0_7px_14px_rgba(21,51,44,0.2)]"
          : "border-[#e1e6e3]"
      }`}
    >
      <h3 className="min-w-0 text-base font-black leading-tight tracking-[-0.01em] text-[#035444] sm:text-[1.05rem]">
        {room.name} - {room.type}
      </h3>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-[0.72rem] font-extrabold leading-tight text-[#5a6670]">
        <span>{room.tables} Tables</span>
        <span>{room.time}</span>
      </div>
      <span
        className={`mt-auto self-end rounded-md border px-2.5 py-1 text-[0.68rem] font-black leading-none ${
          isAvailable
            ? "border-[#078180] bg-[#eefaf6] text-[#08746d]"
            : "border-[#e796a1] bg-[#fff1f3] text-[#e0162f]"
        }`}
      >
        {room.status}
      </span>
    </article>
  );
}
