export type AdminMenuItem = {
  label: string;
  icon: "dashboard" | "booking" | "cashflow" | "users" | "schedule";
  active?: boolean;
};

export type BookingSummary = {
  label: string;
  title: string;
  status: string;
  subtitle: string;
  venue: string;
  initials: string;
  duration: string;
};

export type StatisticItem = {
  label: string;
  value: number;
};

export type ProgressSegment = {
  label: string;
  className: string;
};

export type AdminBooking = {
  room: string;
  status: string;
  payment: string;
  date: string;
  time: string;
  active?: boolean;
};

export const adminMenu: AdminMenuItem[] = [
  { label: "Dashboard", icon: "dashboard", active: true },
  { label: "Booking", icon: "booking" },
  { label: "Cashflow", icon: "cashflow" },
  { label: "Data Users", icon: "users" },
  { label: "Schedule", icon: "schedule" },
];

export const bookingSummary: BookingSummary = {
  label: "BOOKING TERDEKAT",
  title: "Meja VIP - 04",
  status: "Confirmed",
  subtitle: "Rabu, 11 Nov | 2 Jam",
  venue: "Nebula Suite",
  initials: "NB",
  duration: "2 jam",
};

export const statisticItems: StatisticItem[] = [
  { label: "AKTIF", value: 8 },
  { label: "LUNAS", value: 6 },
  { label: "PENDING", value: 1 },
  { label: "BATAL", value: 3 },
];

export const progressSegments: ProgressSegment[] = [
  { label: "Aktif", className: "basis-[40%] bg-[#2FAE9A]" },
  { label: "Lunas", className: "basis-[28%] bg-[#69BE6B]" },
  { label: "Pending", className: "basis-[10%] bg-[#E5E7EB]" },
  { label: "Batal", className: "basis-[22%] bg-[#FF817C]" },
];

export const adminBookings: AdminBooking[] = [
  {
    room: "Room A - Regular",
    status: "Confirmed",
    payment: "Lunas",
    date: "11 Nov 2020",
    time: "11:00 - 12:00",
    active: true,
  },
  {
    room: "Room B - VIP",
    status: "Pending",
    payment: "Tagihan",
    date: "25 Jul 2020",
    time: "19:00 - 20:00",
  },
  {
    room: "Room C - Regular",
    status: "Confirmed",
    payment: "Lunas",
    date: "5 May 2020",
    time: "17:00 - 19:00",
  },
  {
    room: "Room D - VIP",
    status: "Reschedule",
    payment: "Tagihan",
    date: "22 Jul 2020",
    time: "14:00 - 16:00",
  },
  {
    room: "Room E - VIP",
    status: "Reschedule",
    payment: "Refund",
    date: "28 Jul 2020",
    time: "15:00 - 17:00",
  },
  {
    room: "Room F - Regular",
    status: "Reschedule",
    payment: "Tagihan",
    date: "30 Sep 2020",
    time: "18:00 - 20:00",
  },
];
