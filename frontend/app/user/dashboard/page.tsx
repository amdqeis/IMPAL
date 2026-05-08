import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FeaturedRoomCard } from "@/components/dashboard/FeaturedRoomCard";
import { RoomCard } from "@/components/dashboard/RoomCard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { featuredRooms, rooms, sidebarMenu } from "@/data/dashboardDummy";

export default function UserDashboardPage() {
  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#FCFCFC] font-[family-name:var(--font-inter)] text-[#063f35]">
      <Sidebar menu={sidebarMenu} />

      <section className="relative ml-0 flex min-h-screen min-w-0 flex-1 overflow-x-hidden pt-16 md:ml-[86px] md:pt-0 lg:ml-[226px]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/Logo%20Sibooking.png')] bg-[length:220px_220px] bg-repeat opacity-[0.04]" />

        <div className="relative z-10 flex min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex w-full max-w-[1180px] flex-col gap-6 px-4 py-5 sm:px-6 md:px-8">
            <DashboardHeader />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {featuredRooms.map((room) => (
                <FeaturedRoomCard key={room.title} room={room} />
              ))}
            </div>

            <section className="mt-4">
              <div className="mb-6">
                <h2 className="text-[18px] font-bold leading-none text-[#111827]">
                  Rooms
                </h2>
                <div className="mt-3 h-[4px] w-[64px] rounded-full bg-[#F59E0B]" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
