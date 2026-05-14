"use client";

import Image from "next/image";

import type { Pembayaran } from "@/lib/api";

type PaymentMethodProps = {
  disabled?: boolean;
};

type QrisPanelProps = {
  payment: Pembayaran;
  isConfirmingPayment: boolean;
  isRefreshingPayment: boolean;
  onDummyConfirm: () => void;
  onRefreshStatus: () => void;
};

export function PaymentMethod({ disabled = false }: PaymentMethodProps) {
  return (
    <section className="min-h-[368px] rounded-[6px] border border-[#D9D9D9] bg-white/80 p-3">
      <h2 className="text-[16px] font-black text-[#0F4C3E]">Payment Method</h2>
      <button
        type="button"
        disabled={disabled}
        className="mt-2 flex h-[138px] w-[132px] flex-col items-center justify-center rounded-[8px] border border-[#3B82F6] bg-white disabled:opacity-60"
        aria-pressed="true"
      >
        <Image src="/Qris.png" alt="QRIS" width={88} height={88} className="h-[82px] w-[82px]" />
        <span className="text-[18px] font-black text-black">QRIS</span>
      </button>
    </section>
  );
}

export function QrisPanel({
  payment,
  isConfirmingPayment,
  isRefreshingPayment,
  onDummyConfirm,
  onRefreshStatus,
}: QrisPanelProps) {
  const isPaid = payment.status.toLowerCase() === "paid";

  return (
    <section className="flex min-h-[478px] flex-col items-center rounded-[6px] border border-[#D9D9D9] bg-white/85 p-6">
      <div className="text-[64px] font-black tracking-normal text-[#1F2946]">QRIS</div>
      <Image src="/Qris.png" alt="QRIS code" width={230} height={230} className="mt-2 h-[230px] w-[230px] object-contain" />
      <div className="mt-3 w-full max-w-[294px] rounded-[6px] border border-[#D9D9D9] px-4 py-2 text-center text-[12px] font-black text-[#4B5563]">
        Payment #{payment.id_payment} - {payment.status.toUpperCase()}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onDummyConfirm}
          disabled={isConfirmingPayment || isRefreshingPayment || isPaid}
          className="rounded-[8px] bg-[#005344] px-6 py-2 text-[16px] font-black text-white transition hover:bg-[#003E33] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPaid ? "Paid" : isConfirmingPayment ? "Processing..." : "Bayar Dummy"}
        </button>
        <button
          type="button"
          onClick={onRefreshStatus}
          disabled={isRefreshingPayment || isConfirmingPayment}
          className="rounded-[8px] border border-[#005344] bg-white px-6 py-2 text-[16px] font-black text-[#005344] transition hover:bg-[#ECFDF3] disabled:opacity-60"
        >
          {isRefreshingPayment ? "Checking..." : "Refresh Status"}
        </button>
      </div>
    </section>
  );
}
