"use client";

import { Search } from "lucide-react";
import { Fragment } from "react";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type Reservasi } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import { roomLabel } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

const days = [
  ["Mon", "16 Apr"],
  ["Tue", "17 Apr"],
  ["Wed", "18 Apr"],
  ["Thurs", "19 Apr"],
  ["Fri", "20 Apr"],
  ["Sat", "21 Apr"],
  ["Sun", "22 Apr"],
  ["Mon", "23 Apr"],
  ["Tue", "24 Apr"],
  ["Wed", "25 Apr"],
  ["Thurs", "26 Apr"],
];

const hours = Array.from({ length: 14 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);

export default function AdminSchedulePage() {
  const reservations = useApiData<Reservasi[]>(() => api.reservasi.list(), fallbackReservations);

  return (
    <AppShell role="admin">
      <div className="w-full max-w-[1160px] px-4 py-12 sm:px-6 md:px-8">
        <section className="rounded-[12px] border border-[#D9D9D9] bg-white/80 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[38px] font-extrabold leading-none text-[#0F4C3E]">Schedule</h1>
              <p className="mt-1 text-[16px] font-black text-[#16A34A]">Management billiard table reservation</p>
            </div>
            <button className="rounded-[6px] bg-[#21684E] px-4 py-3 text-[20px] font-black text-white">+Add Reservation</button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <select className="h-[38px] rounded-[8px] px-3 text-[20px] font-black text-[#1F2937]"><option>From&nbsp; 01 Apr 2024</option></select>
            <select className="h-[38px] rounded-[8px] px-3 text-[20px] font-black text-[#1F2937]"><option>To&nbsp; 30 Apr 2024</option></select>
            <select className="h-[38px] rounded-[8px] px-14 text-[20px] font-black text-[#1F2937]"><option>All</option></select>
            <label className="ml-auto flex h-[38px] min-w-[330px] items-center gap-2 rounded-[10px] border border-black bg-white px-3">
              <Search className="h-7 w-7 text-[#B6C1D0]" />
              <input className="min-w-0 flex-1 text-[20px] font-bold outline-none placeholder:text-[#B6C1D0]" placeholder="Search Reservation..." />
            </label>
          </div>

          {reservations.error ? <div className="mt-4"><ErrorState message={reservations.error} /></div> : null}
          {reservations.loading ? <div className="mt-4"><LoadingState /></div> : null}
          <div className="mt-2 overflow-x-auto">
            <div className="grid min-w-[1040px] grid-cols-[78px_repeat(11,1fr)] border-l border-[#D8E5DD] text-center">
              <div className="bg-[#F2F8F4] p-3 text-[20px] font-black text-[#174D3D]">Time</div>
              {days.map(([day, date]) => (
                <div key={`${day}-${date}`} className="border-r border-[#D8E5DD] bg-[#F2F8F4] p-3">
                  <p className="text-[20px] font-black text-[#174D3D]">{day}</p>
                  <p className="text-[14px] font-black text-[#5B7769]">{date}</p>
                </div>
              ))}
              {hours.map((hour, rowIndex) => (
                <Fragment key={hour}>
                  <div key={`${hour}-label`} className="border-r border-[#D8E5DD] py-2 text-[16px] font-black text-[#5B7769]">{hour}</div>
                  {days.map(([, date], dayIndex) => {
                    const booking = reservations.data[(rowIndex + dayIndex) % reservations.data.length];
                    const shouldShow = (rowIndex + dayIndex) % 7 === 0 || (rowIndex * dayIndex) % 17 === 0;
                    return (
                      <div key={`${hour}-${date}`} className="relative min-h-[36px] border-r border-[#D8E5DD]">
                        {booking && shouldShow ? (
                          <span className={`absolute left-2 right-2 top-1 rounded-[4px] border px-1 py-1 text-[11px] font-black leading-none ${booking.status === "declined" ? "border-[#FCA5A5] bg-[#FEE2E2] text-[#DC2626]" : "border-[#CFE8DA] bg-[#EFFAF3] text-[#21684E]"}`}>
                            {booking.user?.nama?.split(" ")[0] ?? "Salmen"}
                            <br />
                            {roomLabel(booking.tempat?.nomor_meja)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
