import type { AdminBooking } from "@/data/adminDashboardDummy";

type BookingCardProps = {
  booking: AdminBooking;
};

export function BookingCard({ booking }: BookingCardProps) {
  return (
    <article
      className={`min-h-[208px] rounded-[20px] border bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${
        booking.active
          ? "border-[#60A5FA] ring-2 ring-[#DBEAFE]"
          : "border-[#E5E7EB]"
      }`}
    >
      <h3 className="truncate text-[18px] font-bold leading-none text-[#111827]">
        {booking.room}
      </h3>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
        <InfoItem label="Status" value={booking.status} />
        <InfoItem label="Bayar" value={booking.payment} />
        <InfoItem label="Date" value={booking.date} />
        <InfoItem label="Time" value={booking.time} />
      </div>

      <div className="mt-6 flex items-center gap-8 border-t border-[#E5E7EB] pt-4">
        <button className="text-[15px] font-semibold leading-none text-[#6C4AB6]">
          Accept Booking
        </button>
        <button className="text-[15px] font-semibold leading-none text-[#CBD5E1]">
          Decline
        </button>
      </div>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium leading-none text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-2 truncate text-[15px] font-medium leading-none text-[#334155]">
        {value}
      </p>
    </div>
  );
}
