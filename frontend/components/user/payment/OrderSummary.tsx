import Image from "next/image";

import type { PaymentOrder } from "@/data/paymentDummy";

type OrderSummaryProps = {
  order: PaymentOrder;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <aside className="min-h-[255px] rounded-[20px] border border-[#D9D9D9] bg-white/80 p-5 shadow-sm">
      <h2 className="mb-4 text-[18px] font-bold leading-none text-[#0F5B47]">
        Pesanan Anda
      </h2>

      <div className="flex items-start gap-4">
        <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black">
          <Image
            src="/user (Icon Admin User).png"
            alt="Room avatar"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold leading-tight text-[#0F5B47]">
            {order.roomName}
          </h3>
          <p className="mt-2 text-[14px] font-medium text-[#D1D5DB]">
            Sehat, dan bertenaga
          </p>
        </div>
      </div>

      <div className="mt-16 flex items-center justify-between gap-4">
        <p className="text-[18px] font-bold text-[#C4C4C4]">Total</p>
        <p className="text-right text-[26px] font-extrabold leading-none text-[#0F5B47] sm:text-[32px]">
          {order.total}
        </p>
      </div>

      <button className="mt-5 h-[42px] w-full rounded-[10px] bg-[#3B82F6] text-[16px] font-bold text-white transition-all hover:bg-[#2563EB]">
        Place Order
      </button>
    </aside>
  );
}
