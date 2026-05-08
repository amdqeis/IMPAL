import { BookingCard } from "@/components/admin/booking/BookingCard";
import { Pagination } from "@/components/admin/booking/Pagination";
import { Sidebar } from "@/components/admin/booking/Sidebar";
import {
  adminBookingCards,
  adminBookingMenu,
  paginationItems,
} from "@/data/adminBookingDummy";

export default function AdminBookingPage() {
  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#FCFCFC] font-[family-name:var(--font-inter)] text-[#0F5B47]">
      <Sidebar menu={adminBookingMenu} />

      <section className="relative ml-0 min-h-screen min-w-0 flex-1 overflow-x-hidden pt-16 md:ml-[86px] md:pt-0 lg:ml-[226px]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/Logo%20Sibooking.png')] bg-[length:220px_220px] bg-repeat opacity-[0.04]" />

        <div className="relative z-10 min-w-0 overflow-x-hidden">
          <div className="w-full max-w-[1180px] px-4 py-6 sm:px-6 md:px-8 xl:px-10">
            <h1 className="mb-8 text-[38px] font-extrabold leading-[40px] tracking-tight text-[#0F5B47] sm:text-[46px] sm:leading-[48px] lg:text-[54px] lg:leading-[54px]">
              Booking
            </h1>

            <section className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {adminBookingCards.map((booking) => (
                <BookingCard
                  key={`${booking.roomName}-${booking.roomType}`}
                  booking={booking}
                />
              ))}
            </section>

            <Pagination items={paginationItems} activePage="2" />
          </div>
        </div>
      </section>
    </main>
  );
}
