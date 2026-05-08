import { BookingCard } from "@/components/admin/dashboard/BookingCard";
import { SectionHeader } from "@/components/admin/dashboard/SectionHeader";
import { Sidebar } from "@/components/admin/dashboard/Sidebar";
import { StatisticCard } from "@/components/admin/dashboard/StatisticCard";
import { TopSummaryCard } from "@/components/admin/dashboard/TopSummaryCard";
import {
  adminBookings,
  adminMenu,
  bookingSummary,
  progressSegments,
  statisticItems,
} from "@/data/adminDashboardDummy";

export default function AdminDashboardPage() {
  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#FCFCFC] font-[family-name:var(--font-inter)] text-[#0F5B47]">
      <Sidebar menu={adminMenu} />

      <section className="relative ml-0 min-h-screen min-w-0 flex-1 overflow-x-hidden pt-16 md:ml-[86px] md:pt-0 lg:ml-[226px]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/Logo%20Sibooking.png')] bg-[length:220px_220px] bg-repeat opacity-[0.04]" />

        <div className="relative z-10 min-w-0 overflow-x-hidden">
          <div className="w-full max-w-[1180px] px-4 py-5 sm:px-6 md:px-8 xl:px-10">
            <header>
              <p className="text-[14px] font-semibold leading-none text-[#16A34A]">
                Welcomeback, Andre!
              </p>
              <h1 className="mt-1 text-[38px] font-extrabold leading-[40px] tracking-tight text-[#0F5B47] sm:text-[46px] sm:leading-[48px] lg:text-[54px] lg:leading-[54px]">
                DASHBOARD
              </h1>
            </header>

            <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
              <TopSummaryCard summary={bookingSummary} />
              <StatisticCard items={statisticItems} segments={progressSegments} />
            </section>

            <section className="mt-10">
              <SectionHeader title="Bookings" />

              <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {adminBookings.map((booking) => (
                  <BookingCard key={booking.room} booking={booking} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
