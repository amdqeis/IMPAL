import type { Reservasi } from "@/lib/api";

const PAYMENT_STATUSES = new Set(["unpaid", "pending_payment", "pending", "waiting_payment", "unpaid_payment"]);
const PAID_STATUSES = new Set(["paid", "success", "settlement"]);
const DETAIL_RESERVATION_STATUSES = new Set(["confirmed", "completed"]);
const DETAIL_ONLY_RESERVATION_STATUSES = new Set(["cancelled", "expired", "failed", "refunded", "declined", "no_show"]);

export function normalizeBookingStatus(status: string | null | undefined) {
  return (status ?? "").trim().toLowerCase();
}

export function getLatestPaymentStatus(reservation: Reservasi) {
  const latestFromArray = reservation.payments?.length
    ? [...reservation.payments].sort((a, b) => b.id_payment - a.id_payment)[0]?.status
    : null;
  return normalizeBookingStatus(reservation.latest_payment_status ?? latestFromArray);
}

export function shouldOpenPayment(reservation: Reservasi) {
  const paymentStatus = getLatestPaymentStatus(reservation);
  const reservationStatus = normalizeBookingStatus(reservation.status);

  if (
    DETAIL_ONLY_RESERVATION_STATUSES.has(reservationStatus) ||
    DETAIL_RESERVATION_STATUSES.has(reservationStatus) ||
    PAID_STATUSES.has(paymentStatus)
  ) {
    return false;
  }

  return PAYMENT_STATUSES.has(paymentStatus) || PAYMENT_STATUSES.has(reservationStatus) || !paymentStatus;
}

export function getBookingTargetUrl(reservation: Reservasi) {
  const id = reservation.id_reservasi;
  return shouldOpenPayment(reservation) ? `/user/booking/${id}/payment` : `/user/booking/${id}`;
}

export function getBookingActionLabel(reservation: Reservasi) {
  return shouldOpenPayment(reservation) ? "Click to pay" : "View detail";
}

export function isReservationBlockedForPayment(reservation: Reservasi) {
  const status = normalizeBookingStatus(reservation.status);
  return DETAIL_ONLY_RESERVATION_STATUSES.has(status) || DETAIL_RESERVATION_STATUSES.has(status);
}

export function isPaymentPaid(status: string | null | undefined) {
  return PAID_STATUSES.has(normalizeBookingStatus(status));
}
