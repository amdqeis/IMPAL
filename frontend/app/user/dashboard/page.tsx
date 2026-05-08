import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FeaturedRoomCard } from "@/components/dashboard/FeaturedRoomCard";
import { RoomCard } from "@/components/dashboard/RoomCard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { featuredRooms, rooms, sidebarMenu } from "@/data/dashboardDummy";

export default function UserDashboardPage() {
  return (
    <main className="flex min-h-screen overflow-hidden bg-white font-[family-name:var(--font-dm-sans)] text-[#063f35]">
      <Sidebar menu={sidebarMenu} />

      <section className="relative flex min-h-screen min-w-0 flex-1 overflow-hidden pt-16 md:pl-20 md:pt-0 lg:pl-[9.75rem]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/Logo%20Sibooking.png')] bg-[length:116px_116px] bg-repeat opacity-[0.04] sm:bg-[length:132px_132px]" />

        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-[58rem] px-4 py-5 sm:px-5 md:px-6 md:py-6 xl:max-w-[64rem]">
          <DashboardHeader />

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
            {featuredRooms.map((room) => (
              <FeaturedRoomCard key={room.title} room={room} />
            ))}
          </div>

          <section className="mt-8">
            <div className="mb-4 border-b border-[#e3e7e4] pl-1 sm:pl-2">
              <h2 className="inline-block border-b-4 border-[#f4a000] pb-3 text-base font-black leading-none text-black sm:text-[1.05rem]">
                Rooms
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-6">
              {rooms.map((room) => (
                <RoomCard key={`${room.name}-${room.type}`} room={room} />
              ))}
            </div>
          </section>
          </div>
        </div>
      </section>
    </main>
  );
}
