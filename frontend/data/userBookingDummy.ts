import type { SidebarMenuItem } from "./dashboardDummy";

export type UserBooking = {
  roomName: string;
  customerName: string;
  phone: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
};

export const userBookingMenu: SidebarMenuItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/user/dashboard" },
  { label: "Booking", icon: "booking", active: true, href: "/user/booking" },
  { label: "History", icon: "history", href: "#" },
];

export const userBookings: UserBooking[] = [
  {
    roomName: "Room A - Regular",
    customerName: "Jonathan",
    phone: "081234567",
    bookingDate: "23, March 2026",
    bookingTime: "12:00 - 18:00",
    status: "PAID",
  },
];
