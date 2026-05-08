import Image from "next/image";

const navItems = [
  { label: "Dashboard", icon: "/Booking(Blue).png", active: true },
  { label: "Booking", icon: "/Booking (Gray).png", active: false },
  { label: "Schedule", icon: "/Schedule(Gray).png", active: false },
  { label: "Cashflow", icon: "/Cashflow(Gray).png", active: false },
  { label: "Profile", icon: "/Profile(Gray).png", active: false },
];

const stats = [
  {
    label: "Total Booking",
    value: "128",
    note: "+18 minggu ini",
    icon: "/Booking(Blue).png",
  },
  {
    label: "Meja Tersedia",
    value: "24",
    note: "6 cabang aktif",
    icon: "/pool-table(Booking Complete).png",
  },
  {
    label: "Pendapatan Hari Ini",
    value: "Rp 4,8jt",
    note: "92% terverifikasi",
    icon: "/Cashflow(Blue).png",
  },
  {
    label: "Jadwal Aktif",
    value: "36",
    note: "12 berlangsung",
    icon: "/Schedule(Blue).png",
  },
];

const facilities = [
  { name: "Meja premium", icon: "/billiard-ball(Dashboard User).png" },
  { name: "AC dingin", icon: "/snowflake(Dashboard User).png" },
  { name: "Area sosial", icon: "/Social Area Icon(Dashboard User).png" },
  { name: "Smart TV", icon: "/Television(Dashboard User).png" },
  { name: "Lounge nyaman", icon: "/Couch(Dashboard User).png" },
  { name: "Keamanan", icon: "/shield(Dashboard User).png" },
];

const reservations = [
  {
    name: "Naufal Arkan",
    branch: "Sibooking Dago",
    table: "Meja 08",
    time: "13.00 - 15.00",
    status: "Paid",
  },
  {
    name: "Alya Putri",
    branch: "Sibooking Buah Batu",
    table: "Meja 03",
    time: "15.30 - 17.30",
    status: "Pending",
  },
  {
    name: "Rafi Mahendra",
    branch: "Sibooking Setiabudi",
    table: "Meja 11",
    time: "19.00 - 21.00",
    status: "Paid",
  },
];

const branches = [
  { name: "Dago", booking: 42, revenue: "Rp 1,8jt", level: "w-[88%]" },
  { name: "Buah Batu", booking: 36, revenue: "Rp 1,5jt", level: "w-[74%]" },
  { name: "Setiabudi", booking: 28, revenue: "Rp 1,1jt", level: "w-[58%]" },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#eaf7f0] text-[#173d35]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[18rem_1fr]">
        <aside className="relative overflow-hidden bg-[linear-gradient(165deg,_#1f4736_0%,_#2f8d81_48%,_#89d85e_100%)] px-5 py-6 text-white lg:min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_32%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 shadow-[0_12px_28px_rgba(13,49,39,0.2)]">
                <Image
                  src="/Logo Sibooking.png"
                  alt="SiBooking logo"
                  width={38}
                  height={38}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div>
                <p className="text-xl font-black">SiBooking</p>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  Venue Center
                </p>
              </div>
            </div>

            <nav className="mt-10 grid gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  className={`flex items-center gap-3 rounded-[0.45rem] px-4 py-3 text-sm font-black transition ${
                    item.active
                      ? "bg-white text-[#1f4736] shadow-[0_14px_30px_rgba(18,56,48,0.22)]"
                      : "text-white/78 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  <Image
                    src={item.icon}
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 object-contain"
                  />
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-8 rounded-[0.5rem] border border-white/18 bg-white/12 p-4 shadow-[0_18px_46px_rgba(18,56,48,0.16)] backdrop-blur-sm lg:mt-auto">
              <p className="text-sm font-black">Shift operator</p>
              <p className="mt-1 text-xs font-semibold text-white/76">
                Hari ini 09.00 - 22.00
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Image
                  src="/user (Icon Admin User).png"
                  alt=""
                  width={42}
                  height={42}
                  className="h-10 w-10 rounded-full bg-white/80 object-contain p-1"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">Admin SiBooking</p>
                  <p className="text-xs font-semibold text-white/72">
                    Online
                  </p>
                </div>
              </div>
            </div>

            <a
              href="#"
              className="mt-4 flex items-center gap-3 rounded-[0.45rem] px-4 py-3 text-sm font-black text-white/82 hover:bg-white/12"
            >
              <Image
                src="/logout.png"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
              Logout
            </a>
          </div>
        </aside>

        <section className="overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 rounded-[0.55rem] border border-white bg-white/78 p-4 shadow-[0_18px_50px_rgba(31,71,54,0.09)] backdrop-blur-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2c7d7a]">
                Dashboard gabungan
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl leading-none font-black text-[#173d35] sm:text-5xl">
                Halo, Salsa
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#58706a]">
                Pantau booking, venue, pembayaran, dan performa cabang hari ini.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
              <label className="flex h-12 min-w-0 items-center gap-3 rounded-full border border-[#d8ebe4] bg-white px-4 shadow-[0_10px_24px_rgba(31,71,54,0.07)] sm:min-w-[19rem]">
                <Image
                  src="/magnifying-glass(For Search).png"
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                />
                <input
                  type="search"
                  placeholder="Cari reservasi"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#173d35] outline-none placeholder:text-[#8aa09a]"
                />
              </label>
              <div className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1f4736] px-5 text-sm font-black text-white shadow-[0_14px_26px_rgba(31,71,54,0.22)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#94de5c]" />
                Venue aktif
              </div>
            </div>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-[0.55rem] border border-white bg-white p-5 shadow-[0_18px_46px_rgba(31,71,54,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold text-[#61766f]">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-3xl font-black text-[#173d35]">
                      {stat.value}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.45rem] bg-[#eef8f2]">
                    <Image
                      src={stat.icon}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold text-[#2c8d74]">
                  {stat.note}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="grid gap-6">
              <article className="overflow-hidden rounded-[0.55rem] border border-white bg-white shadow-[0_18px_46px_rgba(31,71,54,0.08)]">
                <div className="grid gap-4 p-5 md:grid-cols-[1fr_13rem] md:items-center">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2c7d7a]">
                      Booking aktif
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-[#173d35]">
                      Meja 08, Dago
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#61766f]">
                      Jadwal main berikutnya dimulai pukul 13.00. Datang 10
                      menit lebih awal untuk check-in dan pembayaran tambahan.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {["13.00", "2 Jam", "Rp 140rb"].map((value) => (
                        <div
                          key={value}
                          className="rounded-[0.45rem] bg-[#eef8f2] px-4 py-3"
                        >
                          <p className="text-lg font-black text-[#173d35]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-h-[12rem] items-center justify-center rounded-[0.55rem] bg-[linear-gradient(135deg,_#4eaabd_0%,_#8ed25c_100%)]">
                    <Image
                      src="/billiard-ball(Dashboard User).png"
                      alt="Billiard ball"
                      width={150}
                      height={150}
                      className="h-32 w-32 object-contain drop-shadow-[0_18px_24px_rgba(24,56,50,0.2)]"
                    />
                  </div>
                </div>
              </article>

              <article className="rounded-[0.55rem] border border-white bg-white p-5 shadow-[0_18px_46px_rgba(31,71,54,0.08)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2c7d7a]">
                      Quick booking
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#173d35]">
                      Pilih slot favorit
                    </h2>
                  </div>
                  <button className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f4736] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(31,71,54,0.18)]">
                    Buat booking
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {["10.00 - 12.00", "15.30 - 17.30", "19.00 - 21.00"].map(
                    (slot) => (
                      <button
                        key={slot}
                        className="rounded-[0.45rem] border border-[#d8ebe4] bg-[#fbfffc] px-4 py-4 text-left text-sm font-black text-[#173d35] transition hover:border-[#2c8d74] hover:bg-[#eef8f2]"
                      >
                        {slot}
                      </button>
                    ),
                  )}
                </div>
              </article>
            </section>

            <section className="rounded-[0.55rem] border border-white bg-white p-5 shadow-[0_18px_46px_rgba(31,71,54,0.08)]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2c7d7a]">
                Fasilitas venue
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#173d35]">
                Siap untuk sesi main
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {facilities.map((facility) => (
                  <div
                    key={facility.name}
                    className="rounded-[0.5rem] bg-[#eef8f2] p-4"
                  >
                    <Image
                      src={facility.icon}
                      alt=""
                      width={42}
                      height={42}
                      className="h-10 w-10 object-contain"
                    />
                    <p className="mt-3 text-sm font-black text-[#173d35]">
                      {facility.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="overflow-hidden rounded-[0.55rem] border border-white bg-white shadow-[0_18px_46px_rgba(31,71,54,0.08)]">
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2c7d7a]">
                    Admin/operator
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[#173d35]">
                    Reservasi terbaru
                  </h2>
                </div>
                <Image
                  src="/schedule icon.png"
                  alt=""
                  width={38}
                  height={38}
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] border-t border-[#e4f0eb] text-left">
                  <thead className="bg-[#f6fbf8] text-xs font-black uppercase tracking-[0.14em] text-[#6c817a]">
                    <tr>
                      <th className="px-5 py-4">Nama</th>
                      <th className="px-5 py-4">Cabang</th>
                      <th className="px-5 py-4">Meja</th>
                      <th className="px-5 py-4">Jam</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4f0eb]">
                    {reservations.map((reservation) => (
                      <tr key={`${reservation.name}-${reservation.time}`}>
                        <td className="px-5 py-4 text-sm font-black text-[#173d35]">
                          {reservation.name}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#61766f]">
                          {reservation.branch}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#61766f]">
                          {reservation.table}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#61766f]">
                          {reservation.time}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              reservation.status === "Paid"
                                ? "bg-[#e6f7ea] text-[#21784f]"
                                : "bg-[#fff4d8] text-[#9a6a04]"
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[0.55rem] border border-white bg-white p-5 shadow-[0_18px_46px_rgba(31,71,54,0.08)]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2c7d7a]">
                Performa cabang
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#173d35]">
                Booking & cashflow
              </h2>

              <div className="mt-5 grid gap-4">
                {branches.map((branch) => (
                  <div key={branch.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#173d35]">
                          {branch.name}
                        </p>
                        <p className="text-xs font-semibold text-[#71867f]">
                          {branch.booking} booking
                        </p>
                      </div>
                      <p className="text-sm font-black text-[#2c8d74]">
                        {branch.revenue}
                      </p>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-[#e4f0eb]">
                      <div
                        className={`h-full rounded-full bg-[linear-gradient(90deg,_#4eaabd_0%,_#8ed25c_100%)] ${branch.level}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[0.5rem] bg-[#1f4736] p-4 text-white">
                <div className="flex items-center gap-3">
                  <Image
                    src="/Qris.png"
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-[0.35rem] bg-white object-contain p-1"
                  />
                  <div>
                    <p className="text-sm font-black">Pembayaran QRIS</p>
                    <p className="text-xs font-semibold text-white/72">
                      31 transaksi berhasil hari ini
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
