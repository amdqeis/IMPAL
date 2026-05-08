import Image from "next/image";

import type { UserBooking } from "@/data/userBookingDummy";

type BookingCardProps = {
  booking: UserBooking;
};

export function BookingCard({ booking }: BookingCardProps) {
  return (
    <article className="relative min-h-[220px] w-full max-w-[420px] overflow-hidden rounded-[24px] border border-[#DCEFE4] bg-[#EDF8F2] p-5 shadow-[0_8px_24px_rgba(15,91,71,0.08)]">
      <div className="relative z-10 max-w-[230px] pr-6 sm:max-w-[250px]">
        <h2 className="text-[20px] font-bold leading-tight text-[#0F5B47]">
          {booking.roomName}
        </h2>

        <div className="mt-2 flex flex-col gap-1 text-[18px] font-semibold leading-tight text-[#0E8B8F]">
          <p>{booking.customerName}</p>
          <p>{booking.phone}</p>
          <p>{booking.bookingDate}</p>
          <p>{booking.bookingTime}</p>
        </div>
      </div>

      <Image
        src="/billiard-ball(Dashboard User).png"
        alt="Billiard balls"
        width={110}
        height={110}
        className="absolute right-5 top-8 h-[92px] w-[92px] object-contain opacity-95 sm:right-6 sm:h-[110px] sm:w-[110px]"
        priority
      />

      <div className="absolute bottom-5 right-5 flex h-[30px] items-center justify-center rounded-xl border border-[#64748B] bg-[#EDF8F2] px-8 text-[16px] font-bold leading-none text-[#0F5B47]">
        {booking.status}
      </div>
    </article>
  );
}
