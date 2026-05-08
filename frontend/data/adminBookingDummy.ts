import type { AdminMenuItem } from "./adminDashboardDummy";

export type AdminBookingCard = {
  roomName: string;
  roomType: string;
  status: string;
  payment: string;
  date: string;
  time: string;
  active?: boolean;
};

export const adminBookingMenu: AdminMenuItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/admin/dashboard" },
  { label: "Booking", icon: "booking", active: true, href: "/admin/booking" },
  { label: "Cashflow", icon: "cashflow", href: "#" },
  { label: "Data Users", icon: "users", href: "#" },
  { label: "Schedule", icon: "schedule", href: "#" },
];

export const adminBookingCards: AdminBookingCard[] = [
  {
    roomName: "Room A",
    roomType: "Regular",
    status: "Confirmed",
    payment: "Lunas",
    date: "11 Nov 2020",
    time: "11:00 - 12:00",
    active: true,
  },
  {
    roomName: "Room B",
    roomType: "VIP",
    status: "Pending",
    payment: "Tagihan",
    date: "25 Jul 2020",
    time: "19:00 - 20:00",
  },
  {
    roomName: "Room C",
    roomType: "Regular",
    status: "Confirmed",
    payment: "Lunas",
    date: "5 May 2020",
    time: "17:00 - 19:00",
  },
  {
    roomName: "Room D",
    roomType: "VIP",
    status: "Reschedule",
    payment: "Tagihan",
    date: "22 Jul 2020",
    time: "14:00 - 16:00",
  },
  {
    roomName: "Room E",
    roomType: "VIP",
    status: "Reschedule",
    payment: "Refund",
    date: "28 Jul 2020",
    time: "15:00 - 17:00",
  },
  {
    roomName: "Room F",
    roomType: "Regular",
    status: "Reschedule",
    payment: "Tagihan",
    date: "30 Sep 2020",
    time: "18:00 - 20:00",
  },
  {
    roomName: "Room G",
    roomType: "VIP",
    status: "Reschedule",
    payment: "Tagihan",
    date: "24 Jul 2020",
    time: "13:00 - 16:00",
  },
  {
    roomName: "Room H",
    roomType: "Regular",
    status: "Reschedule",
    payment: "Refund",
    date: "29 Jul 2020",
    time: "19:00 - 21:00",
  },
  {
    roomName: "Room I",
    roomType: "Regular",
    status: "Reschedule",
    payment: "Tagihan",
    date: "31 Sep 2020",
    time: "08:00 - 10:00",
  },
];

export const paginationItems = ["<", "1", "2", "3", "4", ">>", ">"];
