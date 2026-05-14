import type { Reservasi } from "@/lib/api";
import { ReservationCard } from "@/components/user/ReservationCard";
import { getBookingActionLabel, getBookingTargetUrl } from "@/lib/booking-routing";

type BookingCardProps = {
  booking: Reservasi;
  paymentStatus?: string | null;
  showPaymentStatus?: boolean;
};

export function BookingCard({ booking, paymentStatus, showPaymentStatus = true }: BookingCardProps) {
  const href = getBookingTargetUrl(booking);

  return (
    <ReservationCard
      reservation={booking}
      paymentStatus={paymentStatus ?? booking.latest_payment_status}
      showPaymentStatus={showPaymentStatus}
      href={href}
      actionLabel={getBookingActionLabel(booking)}
    />
  );
}
