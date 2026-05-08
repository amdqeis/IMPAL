export type PaymentOrder = {
  customerName: string;
  phone: string;
  roomType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  roomName: string;
  total: string;
};

export const paymentOrder: PaymentOrder = {
  customerName: "Jonathan",
  phone: "08123456",
  roomType: "VIP",
  bookingDate: "23 March 2026",
  startTime: "12:00",
  endTime: "18:00",
  roomName: "Room A - VIP",
  total: "Rp. 1.000.000",
};
