import { BookingForm } from "@/components/user/payment/BookingForm";
import { OrderSummary } from "@/components/user/payment/OrderSummary";
import { PaymentMethod } from "@/components/user/payment/PaymentMethod";
import { Sidebar } from "@/components/user/payment/Sidebar";
import { sidebarMenu } from "@/data/dashboardDummy";
import { paymentOrder } from "@/data/paymentDummy";

export default function UserPaymentPage() {
  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#FCFCFC] font-[family-name:var(--font-inter)] text-[#0F5B47]">
      <Sidebar menu={sidebarMenu} />

      <section className="relative ml-0 min-h-screen min-w-0 flex-1 overflow-x-hidden pt-16 md:ml-[86px] md:pt-0 lg:ml-[226px]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/Logo%20Sibooking.png')] bg-[length:220px_220px] bg-repeat opacity-[0.04]" />

        <div className="relative z-10 min-w-0 overflow-x-hidden">
          <div className="grid w-full max-w-[1180px] grid-cols-1 gap-8 px-4 py-5 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div className="flex flex-col gap-6">
              <BookingForm order={paymentOrder} />
              <PaymentMethod />
            </div>

            <OrderSummary order={paymentOrder} />
          </div>
        </div>
      </section>
    </main>
  );
}
